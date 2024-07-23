let today = new Date();

let nowHours = today.getHours();

let time = "None";

if(nowHours<=5) {
    time = "새벽";
} else if(nowHours<=11) {
    time = "아침";
} else if(nowHours<=13) {
    time = "점심";
} else if(nowHours<=17) {
    time = "오후";
} else if(nowHours<=19) {
    time = "저녁";
} else if(nowHours<=23) {
    time = "밤";
}

document.write(`<h2>좋은 ${time}이에요! ${time}에는 역시 코딩이죠!</h2>
    <strong>오늘은 어떤 코딩을 할까요?</strong>`)