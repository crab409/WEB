require('dotenv').config();
const OpenAIApi = require('openai');

const openai = new OpenAIApi({
    api_key: 'process.env.OPENAI_API_KEY'
});
  
// ChatGPT에 대화식으로 요청을 보내는 함수
async function callChatGPT(message) {

    //console.log(message)

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', 
                content: "정상적으로 작동하는지 확인하기 위한 코드입니다. 아무 값을 입력했을때, 정상적으로 작동한다면 'ChatGPT API정상작동'출력을" },
              { role: 'user', content: message },
            ],
          });

        // 모델의 응답에서 답변 가져오기
        const answer = response.choices[0].message.content;
        //console.log('ChatGPT 답변:', answer);
    
        return answer;
    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        throw error;
    }
}

module.exports = { callChatGPT };