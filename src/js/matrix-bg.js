// Matrix character rain — digital waterfall effect
// Characters are invisible when static, only visible during the brief moment they change
(function(){
  const canvas=document.getElementById('matrix-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');

  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  const fontSize=14;
  const colWidth=24;       // horizontal spacing
  const rowHeight=32;      // increased vertical spacing between characters
  let columns=[];
  let w,h,rows;

  // Each cell stores: current char, age (frames since last change), and max visible age
  var grid=[];  // grid[col][row] = { char, age }

  function resize(){
    w=canvas.width=window.innerWidth;
    h=canvas.height=window.innerHeight;
    var colCount=Math.floor(w/colWidth);
    rows=Math.floor(h/rowHeight);

    // Rebuild grid
    grid=[];
    for(var i=0;i<colCount;i++){
      grid[i]=[];
      for(var j=0;j<rows;j++){
        grid[i][j]={char:chars[Math.floor(Math.random()*chars.length)],age:999};
      }
    }

    // Rebuild drop columns
    columns=[];
    for(var i=0;i<colCount;i++){
      columns.push({
        y:Math.floor(Math.random()*rows),
        speed:0.4+Math.random()*0.6,
        acc:0,
        length:4+Math.floor(Math.random()*8) // trail length
      });
    }
  }

  function draw(){
    // Clear entire canvas each frame (no trail accumulation)
    ctx.clearRect(0,0,w,h);
    ctx.font=fontSize+'px monospace';

    var colCount=grid.length;

    // Advance drops and mark cells as "freshly changed"
    for(var i=0;i<colCount;i++){
      var col=columns[i];
      col.acc+=col.speed;

      if(col.acc>=1){
        col.acc-=1;
        col.y++;

        // When drop head reaches a cell, change its character and reset age
        var headRow=col.y%rows;
        grid[i][headRow]={
          char:chars[Math.floor(Math.random()*chars.length)],
          age:0
        };

        // Reset if off screen
        if(col.y>rows+col.length+5){
          col.y=-Math.floor(Math.random()*rows*0.5);
          col.speed=0.4+Math.random()*0.6;
          col.length=4+Math.floor(Math.random()*8);
        }
      }
    }

    // Render: only draw cells that were recently changed (age < fadeFrames)
    var fadeFrames=12; // how many frames a char stays visible after changing

    for(var i=0;i<colCount;i++){
      for(var j=0;j<rows;j++){
        var cell=grid[i][j];
        cell.age++;

        if(cell.age>fadeFrames) continue; // invisible — skip drawing

        // Brightness fades as age increases
        var progress=cell.age/fadeFrames; // 0 = just changed, 1 = about to disappear
        var alpha;

        if(cell.age<=1){
          // Head of drop — bright flash
          alpha=0.6+Math.random()*0.3;
        }else{
          // Trail — fading out
          alpha=(1-progress)*0.35;
        }

        if(alpha<=0.01) continue;

        ctx.fillStyle='rgba(0,255,122,'+alpha+')';
        ctx.fillText(cell.char, i*colWidth, j*rowHeight+fontSize);
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize',resize);
  resize();
  draw();
})();
