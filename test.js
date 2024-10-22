require('dotenv').config();
const OpenAIApi = require('openai');

const openai = new OpenAIApi({
    api_key: 'process.env.OPENAI_API_KEY'
});

// ChatGPT에 대화식으로 요청을 보내는 함수
async function callChatGPT(message) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: "다음 내용에서 HTML 태그를 제외한 내용을 한글 존대말로 100자 이내로 요약해주세요." },
              { role: 'user', content: message },
            ],
        });

        // 모델의 응답에서 답변 가져오기
        const answer = response.choices[0].message;
        console.log('ChatGPT 답변:', answer);

        return answer;
    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        throw error;
    }
}

// 메인 실행 함수
(async function() {
    let result = await callChatGPT("다람쥐 챗바퀴 타고파");
    console.log(result);
})();
