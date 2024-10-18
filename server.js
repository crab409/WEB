const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//mongoDB 데이터 베이스와 연결하는 코드
let db;
const url = 'mongodb+srv://admin:PShQ3j41X7AlqfHb@alz.2jxno.mongodb.net/?retryWrites=true&w=majority&appName=alz';
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('alz');
    app.listen(8080, () => { 
        console.log('http://localhost:8080 에서 서버 실행중')
    })
}).catch((err)=>{
    console.log(err)
})


//링크 입력하면 해당 자료 보내주는 코드
app.get('/', async (requ, resp) => {
    let noticeDataSet = await db.collection('notice').find().toArray()
    resp.render('index.ejs', {noticeData: noticeDataSet})
})

app.get('/problem', async (requ, resp) => {
    let problemDataSet = await db.collection('problem').find().toArray()
    resp.render('problem.ejs')
})

app.get('/content', (requ, resp) => {
    resp.render('content.ejs')
})

app.get('/ranking', (requ, resp) => {
    resp.render('ranking.ejs')
})

app.get('/aiClass', (requ, resp) => {
    resp.render('aiClass.ejs')
})

app.get('/aiCreater', (requ, resp) => {
    resp.render('aiCreater.ejs')
})