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
            username: user.username,
            cleareCount: user.cleareCount
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
 * 
 * bubble정렬 알고리즘 사용, 연산속도 느림 
 * ( 연산횟수 N^2, 전교 1, 2학년(400명)을 대상으로 대략 0.1초 연산 예상)
 * -추후 정렬 알고리즘 수정
 * 
 */
const peopleDataSort = function(dataSet) {
    for(let i=0; i<dataSet.length; i++) {
        for(let j=0; j<(dataSet.length)-1-i; j++) {
            if(dataSet[j].cleareCount < dataSet[j+1].cleareCount) {
                let temp = dataSet[j];
                dataSet[j] = dataSet[j+1];
                dataSet[j+1] = temp;
            }
        }
    }

    return dataSet;
}


//링크 입력하면 해당 자료 보내주는 코드
app.get('/', async (requ, resp) => {
    console.log(requ.user)

    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }   

    let noticeDataSet = await db.collection('notice').find().toArray()
    resp.render('index.ejs', {noticeData: noticeDataSet, userData: userData})
})

app.get('/problem', async (requ, resp) => {

    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }

    let problemDataSet = await db.collection('problem').find().toArray()
    resp.render('problem.ejs', {dataSet : problemDataSet, userData:userData})
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

app.get('/register', (requ, resp) => {
    let userData = undefined
    if (requ.user==undefined) {
        userData = null
    } else if (requ.user != undefined){ 
        userData = {
            id: requ.user.id,
            username: requ.user.username
        }
    }

    resp.render('pageRegister.ejs', {userData: userData})
})

app.get('/aiCreater', (requ, resp) => {
    resp.render('aiCreater.ejs')
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
    //let hashedPassword = await bcrypt.hash(요청.body.password, 10)

    await db.collection('user').insertOne({
        username: requ.body.username,
        password: requ.body.password,
        cleareCount: 0
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