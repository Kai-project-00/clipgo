// src/CategoryManager.js - 계층형 카테고리 관리 시스템
class CategoryManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.initialized = false;
    this.maxDepth = 3; // 최대 3단계 계층
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
    this.init();
  }

  async init() {
    try {
      if (!this.storageManager || !this.storageManager.initialized) {
        throw new Error('StorageManager is required and must be initialized');
      }

      // 기본 카테고리 생성 확인
      await this.ensureDefaultCategories();

      this.initialized = true;
      console.log('CategoryManager initialized successfully');
    } catch (error) {
      console.error('CategoryManager initialization failed:', error);
      throw error;
    }
  }

  // 기본 카테고리 생성
  async ensureDefaultCategories() {
    try {
      const categories = await this.storageManager.getCategories();

      if (categories.length === 0) {
        // 기본 카테고리 생성
        const defaultCategories = [
          { name: 'General', parentId: null },
          { name: 'Work', parentId: null },
          { name: 'Personal', parentId: null },
          { name: 'Ideas', parentId: null }
        ];

        for (let i = 0; i < defaultCategories.length; i++) {
          await this.createCategory({
            name: defaultCategories[i].name,
            parentId: defaultCategories[i].parentId,
            order: i
          });
        }

        console.log('Default categories created');
      }
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  }

  // ===== 카테고리 생성 =====

  async createCategory(categoryData) {
    if (!this.initialized) {
      throw new Error('CategoryManager not initialized');
    }

    // 유효성 검사
    const validation = this.validateCategory(categoryData);
    if (!validation.isValid) {
      throw new Error(`Invalid category data: ${validation.errors.join(', ')}`);
    }

    // 중복 이름 체크
    const siblingCategories = await this.getCategoriesByParent(categoryData.parentId);
    if (siblingCategories.some(cat => cat.name === categoryData.name)) {
      throw new Error('Category with this name already exists at this level');
    }

    // 깊이 확인
    if (categoryData.parentId) {
      const depth = await this.getCategoryDepth(categoryData.parentId);
      if (depth >= this.maxDepth - 1) {
        throw new Error(`Maximum depth (${this.maxDepth}) exceeded`);
      }
    }

    const category = {
      ...categoryData,
      id: categoryData.id || Date.now().toString(),
      parentId: categoryData.parentId || null,
      order: categoryData.order || await this.getNextOrder(categoryData.parentId),
      color: categoryData.color || this.generateRandomColor(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // StorageManager를 통해 저장
    const savedCategory = await this.storageManager.createCategory(category);
    this.invalidateCache();

    return savedCategory;
  }

  async createRootCategory(name) {
    return this.createCategory({ name, parentId: null });
  }

  // ===== 카테고리 조회 =====

  async getCategory(id) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const cached = this.getFromCache(`category_${id}`);
    if (cached) return cached;

    const category = await this.storageManager.getCategory(id);
    if (category) {
      this.setToCache(`category_${id}`, category);
    }
    return category;
  }

  async getCategoryTree() {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const cached = this.getFromCache('category_tree');
    if (cached) return cached;

    const flatCategories = await this.storageManager.getCategories();
    const tree = this.buildTree(flatCategories);

    this.setToCache('category_tree', tree);
    return tree;
  }

  async getAllCategories() {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const cached = this.getFromCache('all_categories');
    if (cached) return cached;

    const categories = await this.storageManager.getCategories();
    this.setToCache('all_categories', categories);
    return categories;
  }

  async getCategoriesByParent(parentId) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const allCategories = await this.storageManager.getCategories();
    return allCategories
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  async getCategoryPath(id) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const path = [];
    let currentId = id;

    while (currentId) {
      const category = await this.getCategory(currentId);
      if (!category) break;

      path.unshift(category);
      currentId = category.parentId;
    }

    return path;
  }

  // ===== 카테고리 수정 =====

  async updateCategory(id, updates) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const category = await this.getCategory(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // 이름 변경 시 중복 체크
    if (updates.name && updates.name !== category.name) {
      const siblings = await this.getCategoriesByParent(category.parentId);
      if (siblings.some(cat => cat.name === updates.name && cat.id !== id)) {
        throw new Error('Category with this name already exists at this level');
      }
    }

    const updatedCategory = await this.storageManager.updateCategory(id, {
      ...updates,
      updatedAt: Date.now()
    });

    this.invalidateCache();
    return updatedCategory;
  }

  async moveCategory(id, newParentId) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const category = await this.getCategory(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // 순환 참조 체크
    if (await this.isDescendant(id, newParentId)) {
      throw new Error('Cannot move category to its descendant');
    }

    // 깊이 확인
    if (newParentId) {
      const depth = await this.getCategoryDepth(newParentId);
      if (depth >= this.maxDepth - 1) {
        throw new Error(`Maximum depth (${this.maxDepth}) exceeded`);
      }
    }

    // 순서 재조정
    const newOrder = await this.getNextOrder(newParentId);

    const updatedCategory = await this.storageManager.updateCategory(id, {
      parentId: newParentId,
      order: newOrder,
      updatedAt: Date.now()
    });

    this.invalidateCache();
    return updatedCategory;
  }

  async reorderCategories(categoryIds) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const updates = categoryIds.map((id, index) => ({
      id,
      updates: { order: index, updatedAt: Date.now() }
    }));

    await Promise.all(
      updates.map(({ id, updates }) =>
        this.storageManager.updateCategory(id, updates)
      )
    );

    this.invalidateCache();
  }

  // ===== 카테고리 삭제 =====

  async deleteCategory(id) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    const category = await this.getCategory(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // 하위 카테고리 확인
    const children = await this.getCategoriesByParent(id);
    if (children.length > 0) {
      throw new Error('Cannot delete category with subcategories. Use deleteCategoryWithChildren instead.');
    }

    await this.storageManager.deleteCategory(id);
    this.invalidateCache();
  }

  async deleteCategoryWithChildren(id) {
    if (!this.initialized) throw new Error('CategoryManager not initialized');

    // 재귀적으로 모든 하위 카테고리 삭제
    const children = await this.getCategoriesByParent(id);
    for (const child of children) {
      await this.deleteCategoryWithChildren(child.id);
    }

    await this.storageManager.deleteCategory(id);
    this.invalidateCache();
  }

  // ===== 유틸리티 메소드 =====

  validateCategory(category) {
    const errors = [];

    if (!category.name || typeof category.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    if (category.name && (category.name.length < 1 || category.name.length > 50)) {
      errors.push('Name must be between 1 and 50 characters');
    }

    if (category.name && !/^[a-zA-Z0-9가-힣\s\-_]+$/.test(category.name)) {
      errors.push('Name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    if (category.color && !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
      errors.push('Color must be a valid hex color code');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async isDescendant(parentId, childId) {
    if (!parentId || !childId) return false;
    if (parentId === childId) return true;

    let currentId = childId;
    while (currentId) {
      const category = await this.getCategory(currentId);
      if (!category) break;

      if (category.parentId === parentId) return true;
      currentId = category.parentId;
    }

    return false;
  }

  async getCategoryDepth(categoryId) {
    let depth = 0;
    let currentId = categoryId;

    while (currentId) {
      const category = await this.getCategory(currentId);
      if (!category) break;

      depth++;
      currentId = category.parentId;
    }

    return depth;
  }

  async getCategoryStats(id) {
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error('Category not found');
    }

    const allClips = await this.storageManager.getClips();
    const clipsInCategory = allClips.filter(clip =>
      clip.categoryIds && clip.categoryIds.includes(id)
    );

    const allCategories = await this.storageManager.getCategories();
    const subcategoryCount = allCategories.filter(cat => cat.parentId === id).length;

    return {
      clipCount: clipsInCategory.length,
      subcategoryCount,
      totalClipsIncludingSubcategories: await this.getTotalClipsInSubtree(id)
    };
  }

  async getTotalClipsInSubtree(categoryId) {
    const subtreeIds = await this.getSubtreeIds(categoryId);
    const allClips = await this.storageManager.getClips();

    return allClips.filter(clip =>
      clip.categoryIds && clip.categoryIds.some(id => subtreeIds.includes(id))
    ).length;
  }

  async getSubtreeIds(categoryId) {
    const ids = [categoryId];
    const children = await this.getCategoriesByParent(categoryId);

    for (const child of children) {
      const childSubtreeIds = await this.getSubtreeIds(child.id);
      ids.push(...childSubtreeIds);
    }

    return ids;
  }

  // ===== 검색 기능 =====

  async searchCategories(query) {
    const allCategories = await this.storageManager.getCategories();
    const searchQuery = query.toLowerCase();

    return allCategories.filter(category =>
      category.name.toLowerCase().includes(searchQuery) ||
      (category.description && category.description.toLowerCase().includes(searchQuery))
    );
  }

  // ===== 트리 구조 관리 =====

  buildTree(flatCategories) {
    const nodeMap = new Map();
    const roots = [];

    // 모든 카테고리를 노드로 변환
    flatCategories.forEach(category => {
      nodeMap.set(category.id, {
        ...category,
        children: [],
        depth: 0,
        path: category.name
      });
    });

    // 트리 구조 구축
    flatCategories.forEach(category => {
      const node = nodeMap.get(category.id);
      if (category.parentId) {
        const parent = nodeMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
          node.depth = parent.depth + 1;
          node.path = `${parent.path}/${node.name}`;
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // 각 레벨에서 자식들을 순서대로 정렬
    roots.forEach(root => this.sortTreeNode(root));

    return roots;
  }

  sortTreeNode(node) {
    node.children.sort((a, b) => a.order - b.order);
    node.children.forEach(child => this.sortTreeNode(child));
  }

  flattenTree(treeNodes) {
    const result = [];

    const traverse = (node) => {
      result.push({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        order: node.order,
        color: node.color,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      });

      node.children.forEach(child => traverse(child));
    };

    treeNodes.forEach(node => traverse(node));
    return result;
  }

  findTreeNode(tree, id) {
    for (const node of tree) {
      if (node.id === id) return node;

      const found = this.findTreeNode(node.children, id);
      if (found) return found;
    }
    return null;
  }

  // ===== 캐시 관리 =====

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }

    // 'all_categories' 캐시도 무효화
    this.cache.delete('all_categories');
  }

  // ===== 도우미 메소드 =====

  async getNextOrder(parentId) {
    const siblings = await this.getCategoriesByParent(parentId);
    return siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
  }

  generateRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Export for global use (only in window context)
if (typeof window !== 'undefined') {
  window.CategoryManager = CategoryManager;
}