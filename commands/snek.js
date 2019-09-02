module.exports = {
    name: 'snek',
    description: '',
    usage: '',
    async execute(msg, args)
    {
        class SnakeGame {
            constructor(a) {
                var dirs = ['u','l','d','r'];
                this.position = {
                    x: Math.floor(a/2),
                    y: Math.floor(a/2)
                }
                this.size = a;
                this.treat = this.spawnFood();
                this.board = this.genBrd(a, this.position, this.treat);
                this.snekln = 1;
                this.snekvel = dirs[Math.floor(Math.random()*dirs.length)];
                
            }

            spawnFood() {
                var pos = {
                    x: Math.floor(Math.random() * this.size),
                    y: Math.floor(Math.random() * this.size)
                }
                
                if(pos.x == this.position.x && pos.y == this.position.y) return this.spawnFood()
                return pos;
            }

            genBrd(size, pos, trt) {
                var brd = Array.from(new Array(size), () => new Array(size));
                for(var x = 0; x < brd.length; x++)
                    for(var y = 0; y < brd.length; y++)
                        brd[x][y] = 0;
                brd[pos.y][pos.x] = 1;
                brd[trt.y][trt.x] = 2;
                return brd;
            }

            move(dir) {
                var dirs = ['u','l','d','r'];
                if(dir && !dirs.includes(dir)) return;

                var vl = this.snekvel;
                //if(dir && ((['u','d'].includes(dir) && ['u','d'].includes(vl)) || (['l','r'].includes(dir) && ['l','r'].includes(vl)))) return;

                if(!dir) dir = vl;

                var tpos = this.position;

                switch(dir) {
                    case 'u': if(tpos.y > 0) tpos.y--; else return 'wall'; break;
                    case 'd': if(tpos.y < this.size - 1) tpos.y++; else return 'wall'; break;
                    case 'l': if(tpos.x > 0) tpos.x--; else return 'wall'; break;
                    case 'r': if(tpos.x < this.size - 1) tpos.x++; else return 'wall'; break;
                }

                if(tpos.x == this.treat.x && tpos.y == this.treat.y) {
                    this.snekln++;
                    this.treat = this.spawnFood();
                }

                this.board = this.genBrd(this.size, tpos, this.treat);
                this.snekvel = dir;
                return 'normal';
            }
        }

        function fromBoard(board)
        {
            var out = '';
            for(var x of board)
            {
                for(var z of x)
                    switch(z){
                        case 0: out+='⚫'; break;
                        case 1: out+='🔵'; break;
                        case 2: out+='🔴'; break;
                    }
                out+='\n';
            }
            return out;
        }

        let dir = this.snekvel;
        let gmsg;
        let game = new SnakeGame(13);
        let embed = new Discord.RichEmbed().setTitle("Snake 666").setDescription(fromBoard(game.board));
        await msg.channel.send(embed).then(nmsgg => gmsg = nmsgg);
        setInterval(() => {
            var dirs = ['u','l','d','r'];
            let res = game.move(dir);
            if(res == 'wall') dir = dirs[Math.floor(Math.random()*dirs.length)];
            embed = new Discord.RichEmbed().setTitle("Snake 666").setDescription(fromBoard(game.board));
            gmsg.edit(embed);
        }, 500)

    }
}