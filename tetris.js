class Tetris {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextPiece');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // 先设置游戏配置
        this.cols = 10;
        this.rows = 20;
        this.score = 0;
        this.level = 1;
        
        // 根据屏幕宽度调整画布大小
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // 移动端尺寸
            this.canvas.width = Math.min(300, window.innerWidth - 20);
            this.canvas.height = this.canvas.width * 2; // 增加高度比例确保所有行可见
            this.nextCanvas.width = 50;
            this.nextCanvas.height = 50;
            this.blockSize = this.canvas.width / this.cols; // 现在 this.cols 已经定义
        } else {
            // 桌面端尺寸
            this.canvas.width = 300;
            this.canvas.height = 600;
            this.nextCanvas.width = 100;
            this.nextCanvas.height = 100;
            this.blockSize = 30;
        }
        
        // 初始化游戏板
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        
        // 方块形状
        this.shapes = {
            I: [[1,1,1,1]],
            L: [[1,0],[1,0],[1,1]],
            J: [[0,1],[0,1],[1,1]],
            O: [[1,1],[1,1]],
            Z: [[1,1,0],[0,1,1]],
            S: [[0,1,1],[1,1,0]],
            T: [[1,1,1],[0,1,0]]
        };
        
        // 初始化第一个方块
        const { type: currentType, piece: currentPiece } = this.getNewPiece();
        const { type: nextType, piece: nextPiece } = this.getNewPiece();
        
        this.currentPiece = currentPiece;
        this.currentType = currentType;
        this.nextPiece = nextPiece;
        this.nextType = nextType;
        this.piecePosition = {x: 3, y: 0};
        
        // 绑定按键事件
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // 添加新的属性
        this.isPaused = false;
        this.isGameOver = false;
        this.isStarted = false;
        this.dropInterval = 1000; // 初始下落速度（毫秒）
        this.lastDrop = 0;
        
        // 方块颜色
        this.colors = {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        };
        
        // 初始化音乐相关属性
        this.bgMusic = document.getElementById('bgMusic');
        this.isMuted = false;
        
        // 绑定按钮事件
        this.bindButtons();
        this.bindDirectionButtons();
        this.bindMusicButton();
        
        // 添加画布点击事件
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // 开始游戏循环
        this.gameLoop();
        
        // 绘制初始提示文字
        this.drawStartMessage();
    }

    bindButtons() {
        document.getElementById('startBtn').addEventListener('click', () => {
            if (this.isGameOver || !this.isStarted) {
                this.reset();
                this.isStarted = true;
                this.isGameOver = false;
                document.getElementById('startBtn').textContent = '重新开始';
            }
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            if (this.isStarted && !this.isGameOver) {
                this.isPaused = !this.isPaused;
                document.getElementById('pauseBtn').textContent = 
                    this.isPaused ? '继续' : '暂停';
            }
        });
    }

    reset() {
        this.board = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
        this.score = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.lastDrop = 0;
        this.isPaused = false;
        
        // 重置方块
        const { type: currentType, piece: currentPiece } = this.getNewPiece();
        const { type: nextType, piece: nextPiece } = this.getNewPiece();
        
        this.currentPiece = currentPiece;
        this.currentType = currentType;
        this.nextPiece = nextPiece;
        this.nextType = nextType;
        this.piecePosition = {x: 3, y: 0};
        
        this.updateScore();
        document.getElementById('pauseBtn').textContent = '暂停';
        
        // 重置时播放音乐
        if (!this.isMuted) {
            this.bgMusic.play().catch(error => {
                console.log("音乐自动播放失败，需要用户交互后才能播放");
            });
        }
    }

    getNewPiece() {
        const pieces = Object.keys(this.shapes);
        const type = pieces[Math.floor(Math.random() * pieces.length)];
        const piece = this.shapes[type];
        return { type, piece };
    }

    getRandomPiece() {
        const { type, piece } = this.getNewPiece();
        this.currentType = type;
        return piece;
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
    }

    checkLines() {
        let linesCleared = 0;
        
        for (let row = this.rows - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(this.cols).fill(0));
                linesCleared++;
                row++; // 重新检查当前行，因为上面的行下移了
            }
        }

        if (linesCleared > 0) {
            // 计算分数：一次消除的行数越多，分数越高
            const points = [0, 100, 300, 500, 800];
            this.score += points[linesCleared] * this.level;
            
            // 每1000分升一级
            this.level = Math.floor(this.score / 1000) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            
            this.updateScore();
        }
    }

    gameLoop(timestamp) {
        if (!this.isStarted) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
            return;
        }

        if (!this.isPaused) {
            if (timestamp - this.lastDrop > this.dropInterval) {
                this.update();
                this.lastDrop = timestamp;
            }
            this.draw();
        }

        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize, 
            y * this.blockSize, 
            this.blockSize - 1, 
            this.blockSize - 1
        );
        
        // 添加高光效果
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(
            x * this.blockSize, 
            y * this.blockSize, 
            this.blockSize - 1, 
            (this.blockSize - 1) / 3
        );
    }

    drawPiece() {
        for (let row = 0; row < this.currentPiece.length; row++) {
            for (let col = 0; col < this.currentPiece[row].length; col++) {
                if (this.currentPiece[row][col]) {
                    this.drawBlock(
                        this.piecePosition.x + col, 
                        this.piecePosition.y + row, 
                        this.colors[this.currentType]
                    );
                }
            }
        }
    }

    placePiece() {
        for (let row = 0; row < this.currentPiece.length; row++) {
            for (let col = 0; col < this.currentPiece[row].length; col++) {
                if (this.currentPiece[row][col]) {
                    const boardRow = this.piecePosition.y + row;
                    const boardCol = this.piecePosition.x + col;
                    if (boardRow >= 0) {
                        this.board[boardRow][boardCol] = this.currentType;
                    }
                }
            }
        }
    }

    handleKeyPress(event) {
        if (this.isPaused || !this.isStarted || this.isGameOver) {
            return;
        }
        
        switch(event.keyCode) {
            case 37: // 左
                this.movePiece(-1, 0);
                break;
            case 39: // 右
                this.movePiece(1, 0);
                break;
            case 40: // 下
                this.movePiece(0, 1);
                break;
            case 38: // 上 (旋转)
                this.rotatePiece();
                break;
        }
    }

    movePiece(dx, dy) {
        const newX = this.piecePosition.x + dx;
        const newY = this.piecePosition.y + dy;
        
        if (this.isValidMove(newX, newY, this.currentPiece)) {
            this.piecePosition.x = newX;
            this.piecePosition.y = newY;
            return true;
        }
        return false;
    }

    isValidMove(x, y, piece) {
        for (let row = 0; row < piece.length; row++) {
            for (let col = 0; col < piece[row].length; col++) {
                if (piece[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= this.cols || 
                        newY >= this.rows || 
                        (newY >= 0 && this.board[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.isStarted) {
            // 游戏未开始时显示开始提示
            this.drawStartMessage();
            return;
        }
        
        // 绘制游戏板
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.colors[this.board[row][col]]);
                }
            }
        }
        
        // 绘制当前方块
        this.drawPiece();
        
        // 绘制下一个方块
        this.drawNextPiece();

        // 如果游戏结束，绘制游戏结束文字
        if (this.isGameOver) {
            this.drawGameOver();
        }
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const blockSize = 20;
        
        for (let row = 0; row < this.nextPiece.length; row++) {
            for (let col = 0; col < this.nextPiece[row].length; col++) {
                if (this.nextPiece[row][col]) {
                    this.nextCtx.fillStyle = this.colors[this.nextType];
                    this.nextCtx.fillRect(
                        col * blockSize + 20, 
                        row * blockSize + 20, 
                        blockSize - 1, 
                        blockSize - 1
                    );
                }
            }
        }
    }

    update() {
        if (!this.isStarted || this.isPaused || this.isGameOver) {
            return;
        }

        if (!this.movePiece(0, 1)) {
            this.placePiece();
            this.checkLines();
            this.currentPiece = this.nextPiece;
            this.currentType = this.nextType;
            const { type, piece } = this.getNewPiece();
            this.nextPiece = piece;
            this.nextType = type;
            this.piecePosition = {x: 3, y: 0};
            
            if (!this.isValidMove(this.piecePosition.x, this.piecePosition.y, this.currentPiece)) {
                this.isGameOver = true;
                document.getElementById('startBtn').textContent = '重新开始';
            }
        }
    }

    rotatePiece() {
        if (this.isPaused || !this.isStarted || this.isGameOver) {
            return;
        }

        const rotated = [];
        for (let i = 0; i < this.currentPiece[0].length; i++) {
            const row = [];
            for (let j = this.currentPiece.length - 1; j >= 0; j--) {
                row.push(this.currentPiece[j][i]);
            }
            rotated.push(row);
        }

        if (this.isValidMove(this.piecePosition.x, this.piecePosition.y, rotated)) {
            this.currentPiece = rotated;
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '20px Arial';
        this.ctx.fillText('最终得分: ' + this.score, this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('点击屏幕重新开始', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }

    // 添加画布点击处理方法
    handleCanvasClick() {
        if (!this.isStarted) {
            // 游戏未开始时，点击开始游戏
            this.isStarted = true;
            document.getElementById('startBtn').textContent = '重新开始';
            // 开始时播放音乐
            if (!this.isMuted) {
                this.bgMusic.play().catch(error => {
                    console.log("音乐自动播放失败，需要用户交互后才能播放");
                });
            }
        } else if (this.isGameOver) {
            // 游戏结束时，点击重新开始
            this.reset();
            this.isStarted = true;
            this.isGameOver = false;
            document.getElementById('startBtn').textContent = '重新开始';
        }
    }

    // 添加初始提示文字绘制方法
    drawStartMessage() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('点击屏幕开始', this.canvas.width / 2, this.canvas.height / 2);
    }

    // 添加方向按钮绑定方法
    bindDirectionButtons() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const downBtn = document.getElementById('downBtn');
        const rotateBtn = document.getElementById('rotateBtn');

        // 添加触摸事件处理
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyPress({ keyCode: 37 });
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyPress({ keyCode: 39 });
            });
        }
        
        if (downBtn) {
            downBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyPress({ keyCode: 40 });
            });
        }
        
        if (rotateBtn) {
            rotateBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyPress({ keyCode: 38 });
            });
        }

        // 添加鼠标点击事件处理
        if (leftBtn) leftBtn.addEventListener('click', () => this.handleKeyPress({ keyCode: 37 }));
        if (rightBtn) rightBtn.addEventListener('click', () => this.handleKeyPress({ keyCode: 39 }));
        if (downBtn) downBtn.addEventListener('click', () => this.handleKeyPress({ keyCode: 40 }));
        if (rotateBtn) rotateBtn.addEventListener('click', () => this.handleKeyPress({ keyCode: 38 }));
    }

    // 添加音乐按钮绑定方法
    bindMusicButton() {
        const musicBtn = document.getElementById('musicBtn');
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.toggleMusic();
            });
        }
    }

    // 添加音乐控制方法
    toggleMusic() {
        const musicBtn = document.getElementById('musicBtn');
        if (this.isMuted) {
            this.bgMusic.volume = 1;
            this.isMuted = false;
            musicBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            musicBtn.classList.remove('muted');
        } else {
            this.bgMusic.volume = 0;
            this.isMuted = true;
            musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            musicBtn.classList.add('muted');
        }
    }
}

// 启动游戏
window.onload = () => {
    new Tetris();
};

// 在游戏初始化时添加以下代码
window.addEventListener('keydown', function(e) {
    // 防止方向键滚动页面
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false); 