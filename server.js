const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');

app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({extended:true}))

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

app.get('/', (requ, resp) => {
    resp.render('index.ejs')
})