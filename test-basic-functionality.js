// Basic functionality test script
// This script can be run in the browser console to test basic functionality

class BasicFunctionalityTest {
    constructor() {
        this.results = [];
        this.testName = 'Basic Functionality Test';
    }

    async runAllTests() {
        console.log(`🧪 Starting ${this.testName}...`);

        // Storage Test
        await this.testStorageFunctionality();

        // Category Test
        await this.testCategoryFunctionality();

        // Clip Test
        await this.testClipFunctionality();

        // Search Test
        await this.testSearchFunctionality();

        // Performance Test
        await this.testPerformance();

        this.printResults();
        return this.results;
    }

    async testStorageFunctionality() {
        console.log('📦 Testing Storage Functionality...');

        try {
            // Test storage write
            const testData = { test: 'data', timestamp: Date.now() };
            await chrome.storage.local.set({ testKey: testData });

            // Test storage read
            const result = await chrome.storage.local.get(['testKey']);
            const success = result.testKey && result.testKey.test === 'data';

            // Cleanup
            await chrome.storage.local.remove(['testKey']);

            this.addResult('Storage Read/Write', success, success ? '✅ Storage operations working' : '❌ Storage operations failed');
        } catch (error) {
            this.addResult('Storage Read/Write', false, `❌ Error: ${error.message}`);
        }
    }

    async testCategoryFunctionality() {
        console.log('📂 Testing Category Functionality...');

        try {
            // Test category creation
            const testCategory = {
                id: 'test-category-' + Date.now(),
                name: 'Test Category',
                parentId: null,
                order: 0,
                createdAt: Date.now()
            };

            // Save category
            let categories = [];
            const result = await chrome.storage.local.get(['categories']);
            categories = result.categories || [];
            categories.push(testCategory);
            await chrome.storage.local.set({ categories });

            // Verify category was saved
            const verifyResult = await chrome.storage.local.get(['categories']);
            const categorySaved = verifyResult.categories.some(cat => cat.id === testCategory.id);

            // Test category retrieval
            const retrievedCategories = verifyResult.categories || [];
            const categoryRetrieved = retrievedCategories.length > 0;

            // Cleanup
            const filteredCategories = retrievedCategories.filter(cat => cat.id !== testCategory.id);
            await chrome.storage.local.set({ categories: filteredCategories });

            this.addResult('Category Creation', categorySaved, categorySaved ? '✅ Category creation working' : '❌ Category creation failed');
            this.addResult('Category Retrieval', categoryRetrieved, categoryRetrieved ? '✅ Category retrieval working' : '❌ Category retrieval failed');
        } catch (error) {
            this.addResult('Category Functionality', false, `❌ Error: ${error.message}`);
        }
    }

    async testClipFunctionality() {
        console.log('📝 Testing Clip Functionality...');

        try {
            // Test clip creation
            const testClip = {
                id: 'test-clip-' + Date.now(),
                text: 'This is a test clip',
                title: 'Test Clip',
                tags: ['test', 'sample'],
                categoryIds: [],
                url: 'https://example.com',
                source: 'test',
                createdAt: Date.now()
            };

            // Save clip
            let clips = [];
            const result = await chrome.storage.local.get(['clips']);
            clips = result.clips || [];
            clips.push(testClip);
            await chrome.storage.local.set({ clips });

            // Verify clip was saved
            const verifyResult = await chrome.storage.local.get(['clips']);
            const clipSaved = verifyResult.clips.some(clip => clip.id === testClip.id);

            // Test clip update
            if (clipSaved) {
                const updatedClips = verifyResult.clips.map(clip => {
                    if (clip.id === testClip.id) {
                        return { ...clip, title: 'Updated Test Clip' };
                    }
                    return clip;
                });
                await chrome.storage.local.set({ clips: updatedClips });

                const updateVerify = await chrome.storage.local.get(['clips']);
                const clipUpdated = updateVerify.clips.some(clip =>
                    clip.id === testClip.id && clip.title === 'Updated Test Clip'
                );

                this.addResult('Clip Update', clipUpdated, clipUpdated ? '✅ Clip update working' : '❌ Clip update failed');
            }

            // Test clip deletion
            const filteredClips = verifyResult.clips.filter(clip => clip.id !== testClip.id);
            await chrome.storage.local.set({ clips: filteredClips });

            const deleteVerify = await chrome.storage.local.get(['clips']);
            const clipDeleted = !deleteVerify.clips.some(clip => clip.id === testClip.id);

            this.addResult('Clip Creation', clipSaved, clipSaved ? '✅ Clip creation working' : '❌ Clip creation failed');
            this.addResult('Clip Deletion', clipDeleted, clipDeleted ? '✅ Clip deletion working' : '❌ Clip deletion failed');
        } catch (error) {
            this.addResult('Clip Functionality', false, `❌ Error: ${error.message}`);
        }
    }

    async testSearchFunctionality() {
        console.log('🔍 Testing Search Functionality...');

        try {
            // Create test data
            const testClips = [
                {
                    id: 'search-test-1',
                    text: 'Hello world this is a test',
                    title: 'Hello World',
                    tags: ['hello', 'world'],
                    categoryIds: [],
                    createdAt: Date.now()
                },
                {
                    id: 'search-test-2',
                    text: 'Another test with different content',
                    title: 'Different Content',
                    tags: ['different', 'content'],
                    categoryIds: [],
                    createdAt: Date.now()
                },
                {
                    id: 'search-test-3',
                    text: 'Searching for specific terms',
                    title: 'Search Test',
                    tags: ['search', 'test'],
                    categoryIds: [],
                    createdAt: Date.now()
                }
            ];

            // Save test clips
            await chrome.storage.local.set({ clips: testClips });

            // Test search functionality
            const result = await chrome.storage.local.get(['clips']);
            const clips = result.clips || [];

            // Search for 'hello'
            const helloResults = clips.filter(clip =>
                clip.title.toLowerCase().includes('hello') ||
                clip.text.toLowerCase().includes('hello') ||
                clip.tags.some(tag => tag.toLowerCase().includes('hello'))
            );

            // Search for 'test'
            const testResults = clips.filter(clip =>
                clip.title.toLowerCase().includes('test') ||
                clip.text.toLowerCase().includes('test') ||
                clip.tags.some(tag => tag.toLowerCase().includes('test'))
            );

            const searchWorking = helloResults.length === 1 && testResults.length === 2;

            // Cleanup
            await chrome.storage.local.remove(['clips']);

            this.addResult('Search Functionality', searchWorking, searchWorking ? '✅ Search working correctly' : '❌ search not working correctly');
        } catch (error) {
            this.addResult('Search Functionality', false, `❌ Error: ${error.message}`);
        }
    }

    async testPerformance() {
        console.log('⚡ Testing Performance...');

        try {
            // Create large dataset
            const largeDataset = Array.from({ length: 100 }, (_, i) => ({
                id: `perf-test-${i}`,
                text: `Performance test content ${i}`,
                title: `Performance Test ${i}`,
                tags: ['performance', 'test'],
                categoryIds: [],
                createdAt: Date.now() + i
            }));

            // Test write performance
            const writeStart = performance.now();
            await chrome.storage.local.set({ clips: largeDataset });
            const writeEnd = performance.now();
            const writeTime = writeEnd - writeStart;

            // Test read performance
            const readStart = performance.now();
            const result = await chrome.storage.local.get(['clips']);
            const readEnd = performance.now();
            const readTime = readEnd - readStart;

            // Test search performance
            const searchStart = performance.now();
            const searchResults = result.clips.filter(clip =>
                clip.title.toLowerCase().includes('50')
            );
            const searchEnd = performance.now();
            const searchTime = searchEnd - searchStart;

            // Performance thresholds
            const writeThreshold = 1000; // 1 second
            const readThreshold = 500; // 500ms
            const searchThreshold = 100; // 100ms

            const writePerformance = writeTime < writeThreshold;
            const readPerformance = readTime < readThreshold;
            const searchPerformance = searchTime < searchThreshold;

            // Cleanup
            await chrome.storage.local.remove(['clips']);

            this.addResult('Write Performance', writePerformance,
                writePerformance ? `✅ Write time: ${writeTime.toFixed(2)}ms` : `❌ Write time: ${writeTime.toFixed(2)}ms (threshold: ${writeThreshold}ms)`);

            this.addResult('Read Performance', readPerformance,
                readPerformance ? `✅ Read time: ${readTime.toFixed(2)}ms` : `❌ Read time: ${readTime.toFixed(2)}ms (threshold: ${readThreshold}ms)`);

            this.addResult('Search Performance', searchPerformance,
                searchPerformance ? `✅ Search time: ${searchTime.toFixed(2)}ms` : `❌ Search time: ${searchTime.toFixed(2)}ms (threshold: ${searchThreshold}ms)`);

        } catch (error) {
            this.addResult('Performance Test', false, `❌ Error: ${error.message}`);
        }
    }

    addResult(testName, passed, message) {
        this.results.push({
            test: testName,
            passed: passed,
            message: message,
            timestamp: new Date().toISOString()
        });
    }

    printResults() {
        console.log('\n🧪 Test Results Summary:');
        console.log('='.repeat(50));

        const passedTests = this.results.filter(r => r.passed).length;
        const totalTests = this.results.length;

        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });

        console.log('='.repeat(50));
        console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);

        if (passedTests === totalTests) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed. Please check the results above.');
        }
    }
}

// Auto-run if in a browser environment
if (typeof chrome !== 'undefined' && chrome.storage) {
    const test = new BasicFunctionalityTest();
    test.runAllTests().then(() => {
        console.log('🏁 Basic functionality test completed!');
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
    });
} else {
    console.log('⚠️  This test script must be run in a Chrome extension environment');
}

// Export for manual testing
window.BasicFunctionalityTest = BasicFunctionalityTest;