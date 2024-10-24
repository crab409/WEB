/**
 * todo`````````
 * -채점 시스템 중 기록 시스템 개발
 * -문제 생성 시스템 개발 
 */


//서버 돌리는 npm 라이브러리 가져오기 
const express = require('express');
const app = express();

//mongoDB(우리가 쓰는 데이터 베이스) 연결하는 npm 라이브러리 가져오기 
const { MongoClient, ObjectId } = require('mongodb');

//얘 뭐였더라?
const methodOverride = require('method-override')

//session기능 (로그인 기능) 만드는 npm 라이브러리 가져오기
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo')

//정보를 암호화(해싱) 해주는 npm 라이브러리 가져오기
const bcrypt = require('bcrypt')

// #핵심부품
//const { callChatGPT, chatgptScore } = require('./public/javaScript/chatGptProblemCreate');

require('dotenv').config();
const OpenAIApi = require('openai');

const openai = new OpenAIApi({
    api_key: 'process.env.OPENAI_API_KEY'
});


//미들웨어나 설정을 등록 뭐시기
app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(passport.initialize())
app.use(session({
    secret: '이건엄청난비밀번호',
    resave : false,
    saveUninitialized : false,
    cookie: {maxAge: 1000 * 60 * 60 * 24}, //밀리초 단위로 로그인 유효 시간 설정
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://admin:passwordpassword@alz.2jxno.mongodb.net/?retryWrites=true&w=majority&appName=alz',
        dbName: 'forum'
    })
}))
app.use(passport.session()) 



/**
 * Get local IP address, while ignoring vEthernet IP addresses (like from Docker, etc.)
 * 로컬 IP를 가져와서 변수 localIP에 저장하는 코드(공인 IP가 아닌 사설 IP출력됨)
 * stackOverFlow에서 긁어옴 
 */
let localIP;
var os = require('os');
const { redirect } = require('express/lib/response');
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
            return;
        }

        // Remove 'Ethernet' check, so it works for any interface
        if (alias >= 1) {
            // This single interface has multiple IPv4 addresses
            // console.log(ifname + ':' + alias, iface.address);
        } else {
            // This interface has only one IPv4 address
            // console.log(ifname, iface.address);
        }
        ++alias;
        localIP = iface.address;
    });
});
console.log(localIP);



//데이터 베이스와 서버를 연결하고, 서버를 실행하는 코드
let db;
const url = 'mongodb+srv://admin:passwordpassword@alz.2jxno.mongodb.net/?retryWrites=true&w=majority&appName=alz';
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('alz');
    app.listen(8080, () => { 
        console.log(`http://${localIP}:8080 에서 서버 실행중`)
    })

}).catch((err)=>{
    console.log(err)
})


//passport 라이브러리 이용하는 곳
//입력값과 DB의 값을 비교하는 코드
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
        return cb(null, false, { message: '아이디 DB에 없음' })
    }

    //입력값과 해시값을 입력헀을때, 입력값과 해시값이 같은지 아닌지 판단하는 코드, true와 false를 반환
    //await bcrypt.compare(입력한비번, result.password) //나는 상남자기 때문에 암호화는 쓰지 않음

    if (result.password == 입력한비번) {
        return cb(null, result)
    } else {
        return cb(null, false, { message: '비번불일치' });
    }
}))

passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, {
            id: user._id,
        })
    })
})

//유저가 보낸 쿠키 분석하는 코드
passport.deserializeUser( async (user, done) => {
    let result = await db.collection('user').findOne({_id: new ObjectId(user.id)})
    process.nextTick(() => {
        return done(null, user)
    })
})



/**
 * '/ranking'에서 쓰일 데이터 정렬 함수
 * peoplesData에서 clearCount의 
 * 
 * bubble정렬 알고리즘 사용, 연산속도 느림 
 * ( 연산횟수 N^2, 전교 1, 2학년(400명)을 대상으로 대략 0.1초 연산 예상)
 * 
 * todo - 추후 정렬 알고리즘 수정하기
 */
const peopleDataSort = function(dataSet) {
    for(let i=0; i<dataSet.length; i++) {
        for(let j=0; j<(dataSet.length)-1-i; j++) {
            if(dataSet[j].clearCount < dataSet[j+1].clearCount) {
                let temp = dataSet[j];
                dataSet[j] = dataSet[j+1];
                dataSet[j+1] = temp;
            }
        }
    }

    return dataSet;
}

async function testChat(message) {
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
        //console.log('ChatGPT 답변:', answer);

        return answer;
    } catch (error) {
        console.error('ChatGPT 요청 중 오류:', error);
        throw error;
    }
}

async function chatgptScore(userCode, testCase, answerTable) {
    let messageToSystem = 
    `당신은 온라인 저지 서비스의 채점 시스템입니다. 
    당신에게는 유저의 코드와 테스트 케이스, 그리고 그 테스트 케이스에 맞는 정답표가 주어집니다.
    만약 테스트 케이스가 없는 경우, 즉, 입력이 없는 경우 테스트 케이스는 null로 표기됩니다.
    유저 코드는 python으로 작성되었습니다.
    
    당신은 장문의 말이 아닌, 한글자 혹은 두글자의 단답형 대답만 할 수 있습니다.
    만약, 유저의 코드에 테스트 케이스를 대입하였을때, 정답표와 일치하는 답이 나오면 '1'을 일치하지 못하는 때에는 '0'을 출력하면 됩니다.
    혹은 코드 구문 오류나, 실행중 오류가 발생하는 경우에는 '-1'을 출력하십시오.
    
    아래에 예제문 3개가 첨부됩니다. 
    각각 Hello, World출력문제, 정수 두개 입력받고 더하여 출력하는 문제, 정수 두개를 입력받고 곱하여 출력하는 문제입니다
    {예제문1 유저 입력
    >유저의 코드
    print("Hello, World!")

    >테스트 케이스
    null

    >정답표 
    Hello, World!
    }
    {예제문1 chatGPT 답변
    1
    }

    {예제문2 유저 입력
    >유저 코드
    num1, num2 = map(int, input().split())
    print(num1-num2)

    >테스트 케이스
    1 2

    >정답표
    3
    }
    {예제문2 chatGPT 답변
    0
    }
    {예제문3 유저 입력
    >유저 코드
    num1, num2 = map(int, input().split())
    print(num1*num2

    >테스트 케이스
    1 2

    >정답표
    2
    }
    {예제문2 chatGPT 답변
    -1
    }`

    let messageFromUser = `
    >유저 코드
    ${userCode}

    >테스트 케이스
    ${testCase}

    >정답표 
    ${answerTable}`

    try { 
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {role: 'system', content: messageToSystem},
                {role: 'user', content: messageFromUser}
            ]
        });

        const answer = response.choices[0].message.content;
        //console.log('ChatGPT 답변:', answer);
    
        return answer;


    } catch(err) {
        console.error('ChatGPT 요청 중 오류:', err);
        throw err;
    }
}

async function createProblem(level, algo) {



    let messageToSystem = `
당신은 온라인 저지 문제를 출제하는 출제자입니다. 
입력값은 문제의 난이도와 알고리즘 종류가 입력됩니다. 

문제의 난이도는 0~5까지 존재하며 각각 
0레벨은 백준 새싹레벨과 대응합니다. 즉, print("Hello, world!")와 같은 간단한 문제를 출제합니다.
1레벨은 백준 브론즈V와 대응합니다. 간단한 초보자도 쉽게 풀수 있는 간단한 문제를 출제합니다.
2~4레벨은 백준 브론즈IV~II에 대응합니다. 알고리즘을 공부하는 일반인이 풀만한 문제를 출제합니다.
5레벨은 백준 브론즈I에 대응합니다. 알고리즘에 대해 공부한 사람이 도전할 만한 문제를 출제합니다. 
또한 0~1레벨은 Python을 처음 접하는 초보자를 위해서 제작하는 문제인 만큼 팁이나 사용하면 종은 함수 혹은 제어문에 대한 설명이 첨부되어야 합니다.

알고리즘 종류에 대하여, 입력은 쉼표(,)로 구분된 0개 이상의 문자열 값
만약 0개의 값, 즉 null값이 입력되는 경우, 구현문제나 랜덤한 알고리즘 문제를 출제


출력에 대해서는 아래 태그들로 이루어져 있다.
title: 문제의 제목이다.
content: 문제의 내용이다.
inputExplain: 입력값의 입력 형태나 값의 범위를 지정하여 유저에게 제공한다.
outputExplain: 출력값의 출력 형태를 지정하여 유저에게 제공한다.
sampleInput: 유저에게 제공하는 입력값의 예제이다.
sampleOutput: 유저에게 제공하는 출력값의 예제이다.
testCase: 유저의 코드에 대입할 값, testCase는 한 개로 제한한다. 또한 testCase는 할 수 있는 한 sampleInput과 차이를 두어야 한다.
answerTable: testCase의 값에 대한 정답표이다. 

ChatGPT 출력의 형테는 

/태그
항목
태그/

위와 같은 형태로 출력. 슬래쉬(/)를 이용한 태그의 열고 닫기를 꼭 지킬것
또한 항목은 한국어로 출력하며, 태그는 영문자로 출력한다.

아래는 입력에 대한 출력 예제입니다.
형식에 정확히 맞추어 출력하여야 합니다.

사용자의 가독성을 위하여 줄넘김(\\n)과 같은 개행문자를 권장합니다.
{예제문1 유저 입력
>level
0

>algorithm
null
}

{예제문1 chatGPT 답변
/title
Hello! World!
title/

/content
"Hello, World!"를 출력하세요
(큰따움표 제외)

print("문장")
위와 같이 소스코드를 작성하면
문장이 출력된다. 

즉
print("Hello")
의 결과는 
Hello이다.
content/

/inputExplain
입력없음
inputExplain/

/outputExplain
Hello, World!를 출력한다.
outputExplain/

/sampleInput
입력없음
sampleInput/

/sampleOutput
Hello, World!
sampleOutput/

/testCase
null
testCase/

/answerTable
Hello, World!
answerTable/
}`

    let messageFromUser = `
>level
${level}
    
>algorithm
${algo}`

    try { 
        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {role: 'system', content: messageToSystem},
                {role: 'user', content: messageFromUser}
            ]
        });

        const answer = response.choices[0].message.content;
        //console.log('ChatGPT 답변:', answer);
    
        let result = answer.split('\n');
        //console.log(result)
        
        let title = ""
        let content =  ""
        let inputExplain =  ""
        let outputExplain = ""
        let sampleInput = ""
        let sampleOutput = ""
        let testCase = ""
        let answerTable = ""
        

        for(let i=0; i<result.length; i++) {
            if(result[i]==='/title') {
                for(let j=i+1; j<result.length; j++) { // j=i+1로 시작
                    if (result[j]!="title/") {
                        title = title + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/content') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="content/") {
                        content = content + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/inputExplain') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="inputExplain/") {
                        inputExplain = inputExplain + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/outputExplain') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="outputExplain/") {
                        outputExplain = outputExplain + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/sampleInput') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="sampleInput/") {
                        sampleInput = sampleInput + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/sampleOutput') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="sampleOutput/") {
                        sampleOutput = sampleOutput + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/testCase') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="testCase/") {
                        testCase = testCase + result[j];
                    } else {
                        break;
                    }
                }
            }
            if(result[i]==='/answerTable') {
                for(let j=i+1; j<result.length; j++) {
                    if (result[j]!="answerTable/") {  // 이 부분의 오타 수정: answerTable
                        answerTable = answerTable + result[j];
                    } else {
                        break;
                    }
                }
            }
        }
        

        let newProblemDataSet = {
            title: title,
            content: content,
            inputExplain: inputExplain,
            outputExplain: outputExplain,
            sampleInput: sampleInput,
            sampleOutput: sampleOutput,
            testCase: testCase,
            answerTable: answerTable
        }

        return newProblemDataSet;


    } catch(err) {
        console.error('ChatGPT 요청 중 오류:', err);
        throw err;
    }
}

async function isOk(level, algo) {
    console.log(level, algo)
    for(let i=0; i<5; i++) {

        let newProblemDataSet = await createProblem(level, algo);
        //console.log(newProblemDataSet)
        messageToSystem = `당신은 온라인 저지 문제집 사이트의 문제에 문제점이 없는지 검사하는 검수를 진행할 것입니다. 입력값은 문제에 대한 8개의 제목, 내용, 입력 설명, 출력 설명, 입력 예제, 출력 예제, 테스트 케이스, 정답표입니다.
        특히 문제에 대해서 테스트 케이스에 대한 정답표를 비교하여 이것이 맞는 정답인지 확인하십시오 
        
        당신의 출력은 오직 단답형입니다
        정상적일 경우 1
        문제의 형식이 어색한 경우 2
        문제의 답안이 틀린 경우 3
        을 출력하면 됩니다.`

        messageFromUser = `
title: ${newProblemDataSet.title}
content: ${newProblemDataSet.content}
inputExplain: ${newProblemDataSet.inputExplain}
outputExplain: ${newProblemDataSet.outputExplain}
sampleInput: ${newProblemDataSet.sampleInput}
sampleOutput: ${newProblemDataSet.sampleOutput}
testCase: ${newProblemDataSet.testCase}
answerTable: ${newProblemDataSet.answerTable}
`
        console.log(messageFromUser)

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [
                  { role: 'system', content: messageToSystem },
                  { role: 'user', content: messageFromUser },
                ],
            });
    
            // 모델의 응답에서 답변 가져오기
            const answer = response.choices[0].message.content;
            console.log('ChatGPT 답변:', answer);
    
            if(answer[0]=='1') {
                return newProblemDataSet
            } else if (answer=='2') {
                console.log("형식에 문제가 존재")
            } else if (answer=='3') {
                console.log("답란에 문제가 존재")
            }
        } catch (error) {
            console.error('ChatGPT 요청 중 오류:', error);
            throw error;
        }
    }
}

//링크 입력하면 해당 자료 보내주는 코드
app.get('/', async (req, res) => {
    let result = await testChat("다람쥐 챗바퀴 타고파")
    console.log(result)

    let userData = undefined
    if (req.user==undefined) {
        userData = null
    } else if (req.user != undefined){ 
        userData = await db.collection('user').findOne({_id: new ObjectId(req.user.id)})
    }   

    console.log(userData)

    let noticeDataSet = await db.collection('notice').find().toArray()
    res.render('index.ejs', {noticeData: noticeDataSet, userData: userData})
})

app.get('/problem', async (req, res) => {

    let userData = undefined
    if (req.user==undefined) {
        userData = null
        res.render('pageYouNeedLogIn.ejs', {userData: userData})
    } else if (req.user != undefined){ 
        userData = await db.collection('user').findOne({_id: new ObjectId(req.user.id)})
        solvedNumber = userData.clear;

        //콤마, 숫자, 공백으로 이루어진 문자열을 정수 배열로 변환하는 코드
        solvedNumber = solvedNumber.split(',').map(item => Number(item.trim()));
        
        let problemDataSet = await db.collection('problem').find().toArray()
        res.render('problem.ejs', {dataSet : problemDataSet, userData:userData})

    }
    
})

app.get('/problem/:id', async (req, res) => {
    try {

        let sibal = await db.collection('problem').findOne({ _id : new ObjectId(req.params.id)})
        
        let userData = undefined
        if (req.user==undefined) {
            userData = null
            res.send("logIn 이후 사용가능한 서비스입니다.")

        } else if (req.user != undefined){ 
            userData = await db.collection('user').findOne({_id: new ObjectId(req.user.id)})
            res.render('pageOneProblem.ejs', {dataSet: sibal, userData: userData})
        }

        
    } catch(e) {
        console.log(e)
        res.send("url 입력중 버그 발생")
    }
})

app.get('/content', (requ, resp) => {

    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }

    resp.render('content.ejs', {userData: userData})
})

app.get('/ranking', async (requ, resp) => {

    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }

    let peoplesData = await db.collection('user').find().toArray()
    peoplesData = await peopleDataSort(peoplesData)

    console.log(peoplesData)

    resp.render('ranking.ejs', {userData: userData, peoplesData: peoplesData})
})

app.get('/aiClass', (requ, resp) => {
    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }

    resp.render('aiClass.ejs', {userData: userData})
})

app.get('/account', (requ, resp) => {

    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }   

    if(!userData) {
        resp.render('pageLogin.ejs', {userData: userData})

    } else { 
        resp.render('account.ejs', {userData: userData})

    }
})

app.get('/register', async (req, res) => {
    let userData = undefined
    if(req.user==undefined) {
        userData = null
    } else if (req.user != undefined) {
        userData = await db.collection('user').findOne({_id: new ObjectId(req.user.id)})
    }

    res.render('pageRegister.ejs', {userData: userData})
})

app.get('/aiCreater', async (req, res) => {
    let userData = undefined
    if(req.user==undefined) {
        userData = null
        res.send('log in이후 사용가능한 서비스입니다.')
    } else if (req.user != undefined) {
        userData = await db.collection('user').findOne({_id: new ObjectId(req.user.id)})
        res.render('pageAiCreater.ejs', {userData: userData})
    }
})



app.post('/login', async (requ, resp, next) => {

    passport.authenticate('local', (error, user, info) => {
        if (error) return resp.status(500).json(error)
        if (!user) resp.status(400).send(info.message)
        requ.logIn(user, (err) => {
            if (err) return next(err)
            resp.redirect('/')
        })
    })(requ, resp, next)
})

app.post('/register', async (requ, resp, next) => {

    //정보 암호화(해싱) 하는 코드, 하지만 난 상남자기 때문에 주석 처리할꺼임
    //let hashedPassword = await bcrypt.hash(requ.body.password, 10)

    await db.collection('user').insertOne({
        username: requ.body.username,
        password: requ.body.password,
        clearCount: 0,
        clear: "",
        wrong: ""
    })

    passport.authenticate('local', (error, user, info) => {
        if (error) return resp.status(500).json(error)
        if (!user) return alert(info.message)
        requ.logIn(user, (err) => {
            if (err) return next(err)
                resp.redirect('/')
        })
    })(requ, resp, next)
})

app.post('/logOut', (requ, resp, next) => {
    requ.logOut(function(err) {
        if (err) {return next(err)}
        requ.session.destroy();
        resp.redirect('/')
    })
})


app.post('/problemSumit', async (req, res) => {
    dataSet = {
        code: req.body.code,
        userId: req.body.id,
        problemId: req.body.problemId
    }

    let problemData = await db.collection('problem').findOne({_id: new ObjectId(dataSet.problemId)})
    let userData = await db.collection('user').findOne({_id: new ObjectId(dataSet.userId)})

    let userSolvedData = userData.clear.split(',')


    console.log(problemData)
    console.log(userData)

    let result = await chatgptScore(dataSet.code, problemData.testCase, problemData.answerTable)

    if (result[0]==='1') {
        console.log("정답 입력됨")
        await db.collection('user').updateOne({_id: new ObjectId(userData._id)},{
            $set: {clearCount: (userData.clearCount+1), clear: userData.clear + `${problemData.number}`}
        })
        await db.collection('problem').updateOne({_id: new ObjectId(problemData._id)}, {
            $set: {clearCount: (problemData.clearCount+1)}
        })
    } else {
        console.log("정답이 아닌것이 입력됨")
    }

    console.log(result)
    res.send('처리 완료')
})

app.post('/createProblem', async (req, res) => {
    inputData = {
        level: req.body.problemLevel,
        algo: req.body.problemAlgorithm,
        createrId: req.body.createrId
    }

    let result = await isOk(inputData.level, inputData.algo);
    if (result == undefined) {
        res.send('생성실패...\n 다시 시도하시오.')
    } else {
        let userData = await db.collection('user').findOne({_id: new ObjectId(inputData.createrId)})
        console.log(result)
        res.render('pageRenderChecker.ejs', {dataSet: result, userData:userData})
    }
})

app.post('/problemRenderSumit', async (req, res) => {
    let problemList = await db.collection('problem').find().toArray()
    let newNumber = await problemList[problemList.length-1] + 1;

    newProblemDataSet = {
        number: newNumber,
        title: req.body.title,
        content: req.body.content,
        inputExplain: req.body.inputExplain,
        outputExplain: req.body.outputExplain,
        sampleInput: req.body.sampleInput,
        sampleOutput: req.body.sampleOutput,
        testCase: req.body.testCase,
        asnwerTable: req.body.answerTable,
        createrId: req.body.createrId,
        isGenerated: true,
        clearCount: 0
    }
    let userData = await db.collection('user').findOne({_id: new ObjectId(newProblemDataSet.createrId)})
    await db.collection('problem').insertOne(newProblemDataSet)
    res.redirect('/problem')
})

app.post('/cancel', (req, res) => {
    let userData = db.collection('user').findOne({_id: new ObjectId(req.user.id)})
    res.redirect('/')
})