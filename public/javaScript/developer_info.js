developer = [
    ["홍유민", "202410520@dong-a.hs.kr", "yumin0878@naver.com"],
    ["이승민", "202410520@dong-a.hs.kr"],
    ["김성건", "202410702@dong-a.hs.kr"],
    ["이준석", "202410916@dong-a.hs.kr"]
]

i = 0;
while(i<developer.length) {
    j = 0;
    document.write('<li><ul>');
    while(j<developer[i].length) {
        if(j===0) {
            document.write('<li><strong>'+developer[i][j]+'</strong></li>');
        } else {
            document.write('<li>'+developer[i][j]+'</li>');
        }
        j-=-1;
    }
    document.write('</ul></li>');
    i-=-1;
}