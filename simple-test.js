// 간단한 테스트 콘텐츠 스크립트
console.log('🎯 SIMPLE TEST SCRIPT LOADED!');

// 페이지가 로드되었음을 알리는 간단한 알림
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM Content Loaded');

    // 간단한 텍스트 선택 감지
    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length > 0) {
            console.log('📝 Text selected:', selectedText.substring(0, 50));
            alert(`텍스트 선택됨: ${selectedText.substring(0, 30)}...`);
        }
    }, true);

    console.log('✅ Event listeners added');
});

// 전역에 테스트 함수 노출
window.simpleTest = () => {
    console.log('🧪 Simple test function called');
    alert('Simple test is working!');
};