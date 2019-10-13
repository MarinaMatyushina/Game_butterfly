var canvas, ctx, window_x, element ={type:0, i:0 }, ANIM;
var flag=0;
function docSetup(){
	canvas = document.getElementById("canvas"), 
	ctx = canvas.getContext("2d"),
	window_x = 0,
	element ={type:0, i:0 }
}	
	
function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function getItem(item){
	if(localStorage)
		return localStorage.getItem(item);
	else
		return null;
}

function setItem(item, val){
	if(localStorage){
		localStorage.setItem(item, val);
	}
}

var scoreTable = JSON.parse(getItem("table")) || [];
scoreTable.get = function(){
	this.sort(function(a,b) {
		return b[2] - a[2];
	});
	
	var n, content = "";
	for(n = 0; n < scoreTable.length; n++){
		content += "<tr><td>" + scoreTable[n][0] + "</td>" + "<td>" + scoreTable[n][1] + "</td>" + "<td>" + scoreTable[n][2] + "</td></tr>";
	}
	return content;
};
scoreTable.add = function(name, data){
	var date = new Date(), time = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
	
	this.push([time, name, data]);
	setItem("table", JSON.stringify(this));
};

window.onload = function(){
	document.getElementById("records").innerHTML = scoreTable.get();
}

var mapManager = {
    mapData: null,
    tLayer: null,
    xCount: 0, //20
    yCount: 0, //6
    imgLoadCount: 0, // количество загруженных изображений
    imgLoaded: false, // изображения не загружены
    jsonLoaded: false, // json не загружен
    tSize: {x: 32, y: 32},
    mapSize: {x: 128, y: 20},
    view: {x: 0, y: 0, w: 9600, h: 650},
    tilesets: [],
      // ajax-загрузка карты
    loadMap: function (path) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                mapManager.parseMap(request.responseText);
            }
        };
        request.open("GET", path, true);
        request.send();
    },
    parseMap: function (tilesJSON) {
            this.mapData = JSON.parse(tilesJSON); //разобрать JSON
            this.xCount = this.mapData.width; // соэранение ширины
            this.yCount = this.mapData.height; // сохранение высоты
            this.tSize.x = this.mapData.tilewidth; // сохранение размера блока
            this.tSize.y = this.mapData.tileheight; // сохранение размера блока
            this.mapSize.x = this.xCount * this.tSize.x; // вычисление размера карты
            this.mapSize.y = this.yCount * this.tSize.y;
            for (var i = 0; i < this.mapData.tilesets.length; i++) {
                var img = new Image(); // создаем переменную для хранения изображений
                img.onload = function () { // при загрузке изображения
                    mapManager.imgLoadCount++;
                    if (mapManager.imgLoadCount === mapManager.mapData.tilesets.length) {
                        mapManager.imgLoaded = true; // загружены все изображения
                    }
                };
                img.src = this.mapData.tilesets[i].image; // задание пути к изображению
                var t = this.mapData.tilesets[i]; //забираем tileset из карты
                var ts = { // создаем свой объект tileset
                    firstgid: t.firstgid, // с него начинается нумерация в data
                    image: img,
                    name: t.name, // имя элемента рисунка
                    xCount: Math.floor(t.imagewidth / mapManager.tSize.x), // горизонталь
                    yCount: Math.floor(t.imageheight / mapManager.tSize.y) // вертикаль
                }; // конец объявления ts
                this.tilesets.push(ts); // сохраняем tileset в массив
            } // окончание цикла for
            this.jsonLoaded = true; // когда разобран весь json
        },
    draw: function (ctx) { // отрисовка карты в контексте
        // если карта не загружена, то повторить прорисовку через 100 мс
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.draw(ctx);
            }, 100);
        } else {
            var layerCount = 0;
            if (this.tLayer === null) {// проверка, что tLayer настроен
                for (var id = 0; id < this.mapData.layers.length; id++) {
                    // проходим по всем layer карты
                    var layer = this.mapData.layers[id];
                    if (layer.type === "tilelayer") {
                        this.tLayer = layer;
                        //break;  !!!
                    }
                }
            }
            for (var i = 0; i < this.tLayer.data.length; i++) { // проходим по всей карте  !!!
                if (this.tLayer.data[i] !== 0) { // если данных нет, то пропускаем
                    var tile = this.getTile(this.tLayer.data[i]); // получение блока по индексу
                    var pX = (i % this.xCount) * this.tSize.x; // вычисляем x в пикселях
                    var pY = Math.floor(i / this.xCount) * this.tSize.y;
                    // не рисуем за пределами видимой зоны
                    if (!this.isVisible(pX, pY, this.tSize.x, this.tSize.y))
                        continue;
                    // сдвигаем видимую зону
                    pX -= this.view.x;
                    pY -= this.view.y;
                    ctx.drawImage(tile.img, tile.px, tile.py, this.tSize.x, this.tSize.y, pX - window_x, pY, this.tSize.x, this.tSize.y); //
                    //отрисовка в контексте
                }
            }
        }
    },
getTile: function (tileIndex) { // индекс блока
        var tile = {
            img: null, // изображение tileset
            px: 0, py: 0 // координаты блока в tileset
        };
        var tileset = this.getTileset(tileIndex);
        tile.img = tileset.image; // изображение искомого tileset
        var id = tileIndex - tileset.firstgid; // индекс блока в tileset
        // блок прямоугольный, остаток от деления на xCount дает х в tileset
        var x = id % tileset.xCount;
        var y = Math.floor(id / tileset.xCount);
        tile.px = x * mapManager.tSize.x;
        tile.py = y * mapManager.tSize.y;
        return tile; // возвращаем тайл для отображения
    },

    getTileset: function (tileIndex) { // получение блока по индексу
        for (var i = mapManager.tilesets.length - 1; i >= 0; i--) {
            // в каждом tilesets[i].firstgid записано число, с которого начинается нумерация блоков
            if (mapManager.tilesets[i].firstgid <= tileIndex) {
                // если индекс первого блока меньше , либо равен искомому, значит этот tileset и нужен
                return mapManager.tilesets[i];
            }
        }
        return null;
    },

    isVisible: function (x, y, width, height) {
        // не рисуем за пределами видимой зоны
        return !(x + width < this.view.x || y + height < this.y || x > this.view.x + this.view.w || y > this.view.y + this.view.h);
    },
    parseEntities: function () { // разбор слоя типа objectgroup
        if (!mapManager.imgLoaded || !mapManager.jsonLoaded) {
            setTimeout(function () {
                mapManager.parseEntities();
            }, 100);
        } else
            for (var j = 0; j < this.mapData.layers.length; j++) // просмотр всех слоев
                if (this.mapData.layers[j].type === 'objectgroup') {
                    var entities = this.mapData.layers[j]; // слой с объектами следует разобрать
                    for (var i = 0; i < entities.objects.length; i++) {
                        var e = entities.objects[i];
                        try {
                            var obj = Object.create(gameManager.factory[e.type]);
                            obj.name = e.name;
                            obj.pos_x = e.x;
                            obj.pos_y = e.y;
                            obj.size_x = e.width;
                            obj.size_y = e.height;

                            if (obj.name === 'Player') {
                                obj.dirSprite = '3_2';
                                gameManager.initPlayer(obj);
                            }
                            if (obj.name === 'monster') {
                                obj.dirSprite = 'monster_2';
                                gameManager.initMonster(obj);
                            }
                            gameManager.entities.push(obj);
                        } catch (ex) {
                            console.log("Error while creating: [" + e.gid + "]" + e.type + " " + ex);
                        }
                    }
                }
    },
    getTilesetIdx: function (x, y) {
        // получить блок по координатам на карте
        var wX = x;
        var wY = y;
        var idx = Math.floor(wY / this.tSize.y) * this.xCount + Math.floor(wX / this.tSize.x);
        return this.tLayer.data[idx];
    }
};

var spriteManager = {
    image: new Image(),
    sprites: [],
    imgLoaded: false,
    jsonLoaded: false,
    loadAtlas: function (atlasJson, atlasImg) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                spriteManager.parseAtlas(request.responseText);
            }
        };
        request.open("GET", atlasJson, true);
        request.send();
        this.loadImg(atlasImg);
    },

    loadImg: function (imgName) { // загрузка изображения
        this.image.onload = function () {
            spriteManager.imgLoaded = true;
        };
        this.image.src = imgName;
    },

    parseAtlas: function (atlasJSON) { // разбор атласа с обеъектами
        var atlas = JSON.parse(atlasJSON);
        for (var name in atlas.frames) { // проход по всем именам в frames
            var frame = atlas.frames[name].frame; // получение спрайта и сохранение в frame
            this.sprites.push({name: name, x:frame.x, y: frame.y, w: frame.w, h: frame.h}); // сохранение характеристик frame в виде объекта
        }
        this.jsonLoaded = true; // атлас разобран
    },

    drawSprite: function (ctx, name,  x, y) {
        // если изображение не загружено, то повторить запрос через 100 мс
        if (!this.imgLoaded || !this.jsonLoaded) {
            setTimeout(function () {
                spriteManager.drawSprite(ctx, name, x, y);
            }, 100);
        } else {
            var sprite = this.getSprite(name); // получить спрайт по имени
            if (!mapManager.isVisible(x, y, sprite.w, sprite.h))
                return; // не рисуем за пределами видимой зоны
            x -= mapManager.view.x;
            y -= mapManager.view.y;
            // отображаем спрайт на холсте
            ctx.drawImage(this.image, sprite.x, sprite.y, sprite.w, sprite.h, x-window_x, y, sprite.w, sprite.h);
            // }

        }
    },

    getSprite: function (name) { // получить спрайт по имени
        for (var i = 0; i < this.sprites.length; i++) {
            var s = this.sprites[i];
            if (s.name === name)
                return s;
        }
        return null; // не нашли спрайт
    }

};

var eventsManager = {
    bind: [], // сопоставление клавиш действиям
    action: [], // действия
    setup: function () { // настройка сопоставления
        this.bind[87] = 'up'; // a - двигаться вверх
        this.bind[65] = 'left'; // a - двигаться влево
        this.bind[68] = 'right'; // a - двигаться вправо
        this.bind[83] = 'down'; // d - двигаться вниз
        document.body.addEventListener("keydown", this.onKeyDown);
        document.body.addEventListener("keyup", this.onKeyUp);
    },
    onKeyDown: function (event) {
        var action = eventsManager.bind[event.keyCode];
        if (action) {
            if (action) // проверка на action === true
                eventsManager.action[action] = true; // выполняем действие
        }
    },
    onKeyUp: function (event) {
        var action = eventsManager.bind[event.keyCode];
        if (action)
            eventsManager.action[action] = false; // отменили действие
    }
};

var physicManager = {
    update: function (obj) {
        if (obj.move_x === 0 && obj.move_y === 0)
            return "stop"; // скорости движения нулевые

        var newX = obj.pos_x + Math.floor(obj.move_x * 5);
        var newY = obj.pos_y + Math.floor(obj.move_y * 5);
        var e = this.entityAtXY(obj, newX, newY); // объект на пути
        if (e !== null && obj.onTouchEntity) // если есть конфликт
            obj.onTouchEntity(e); // разбор конфликта внутри объекта
        //Если есть препятствие 
        
        if (e === null) { // перемещаем объект на свободное место
            obj.pos_x = newX;
            obj.pos_y = newY;
        } else
            return "break"; // дальше двигаться нельзя

        switch (obj.move_y) {
            case -1: // двигаемся вверх
                return "up";
                break;
            case 1: // двигаемся вниз
                return "down";
                break;
        };
        switch (obj.move_x) {
            case -1: // двигаемся влево
                return "left";
                break;
            case 1: // двигаемся вправо
                return "right";
                break;
         }
    },
    entityAtXY: function (obj, x, y) { // поиск объекта по координатам
        for (var i = 0; i < gameManager.entities.length; i++) {
            var e = gameManager.entities[i]; // рассматриваем все объекты на карте
            if (e.name !== obj.name) { // имя не совпадает
                if (x + obj.size_x < e.pos_x || // не пересекаются
                    y + obj.size_y < e.pos_y ||
                    x > e.pos_x + e.size_x ||
                    y > e.pos_y + e.size_y)
                    continue;
                return e; // найден объект
            }
        }
        return null; // объект не найден
    }
};

var soundManager = {
	src_array: ['music/car.mp3','music/tank.mp3','music/break.mp3','music/winner.mp3','music/fuel.wav', 'music/levelup.wav'],
    Audio: new Audio(),
	Music: new Audio(),
	done: false,
	init: function(){
		if(!this.done){
			this.Music.src = "music/background.mp3";
			this.Music.loop = true;
			this.Music.volume = 0.3;
			this.done = true;
		}
	},
	playBG: function(x){
		if(x)
			this.Music.play();
		else 
			this.Music.pause();
	},
	playSound: function(x){
		console.log(x);
		this.Audio.pause();
		this.Audio.src = this.src_array[x - 1];
		this.Audio.play();
	},
	stopAll: function(){
		this.Audio.pause();
		this.Music.pause();
	}
};

var Entity = {
    pos_x: 0, pos_y: 0, // позиция объекта
    size_x: 0, size_y: 0, // размеры объекта
    extend: function (extendProto) { // расширение сущности
        var object = Object.create(this); // создание нового объекта
        for (var property in extendProto) { // для всех свойств нового объекта
            if (this.hasOwnProperty(property) || typeof object[property] === 'undefined') {
                // если свойства отсутствуют в родительском объекте, то добавляем
                object[property] = extendProto[property];
            }
        }
        return object;
    }
};

var Fuel = Entity.extend({
    dirSprite: "7",
    draw: function (ctx) {
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    kill: function () {
        gameManager.kill(this);
    },
    update: function () {

    }
});

var Border = Entity.extend({
    
    move_x: 0,
    move_y: 0,
    draw: function (ctx) {// прорисовка объекта
    }
});
var Player = Entity.extend({
    move_x: 0, move_y: 0,
    direction: 1,
	deltaSprite: 1000,
    dirSprite: "3_1",
    speed_x: 0,
    draw: function (ctx) {
        if(element.type===0){
					this.deltaSprite++;
					if(this.deltaSprite % 10 == 0){
                        this.dirSprite= "3_1";
						if(this.deltaSprite % 20 == 0){
							this.dirSprite= "3_2";
						}
					}
				
        }
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    update: function () {
        physicManager.update(this);

    },
    onTouchEntity: function (obj) {
        if (obj.name.match(/fuel/)) {
			obj.kill();
			flag=flag+1;
			gameManager.score++;
			soundManager.playSound(5);
			document.getElementById("score").innerHTML = "Счёт: " + gameManager.score;
            if (flag===12 && gameManager.curr_level<gameManager.max_level){
                gameManager.levelUp();
                flag=0;
            }
            if(gameManager.curr_level == gameManager.max_level){
                if (flag==12){
                    gameManager.gameEnd(false);
                }
            }
        }
        if (obj.name.match(/monster/)) {
            this.kill();
            gameManager.gameEnd(true);
        }
    },
    kill: function () {
        gameManager.kill(this);
        
    }}
);
var monster = Entity.extend({
    move_x: 0, move_y: 0,
    direction: 1,
    deltaSprite: 1000,
    dirSprite: "monster_1",
    speed_x: 0,
    draw: function (ctx) {

            this.deltaSprite++;
            if(this.deltaSprite % 10 == 0){
                this.dirSprite= "monster_1";
                if(this.deltaSprite % 20 == 0){
                    this.dirSprite= "monster_2";
                }
            }
        spriteManager.drawSprite(ctx, this.dirSprite, this.pos_x, this.pos_y);
    },
    update: function () {
        physicManager.update(this);
    },
    kill: function () {
        gameManager.kill(this);

    },
    onTouchEntity: function (obj) {
        if (obj.name.match(/Player/)) {
            this.kill();
            gameManager.gameEnd(true);
        }}}
);

var gameManager = { // менеджер игры
    factory: null, // фабрика объектов на карте
    entities: null, // объекты на карте
    player: null, // указатель на объект игрока
    monster: null,
	nickname: "",
    score : 0,
	curr_level: 1, max_level: 3,
    laterKill: [],
    initPlayer: function (obj) { // инициализация игрока
        this.player = obj;
    },
    initMonster: function (obj) { // инициализация monster
        this.monster = obj;
    },
    update: function () { // обновление информации
        if (this.player === null)
            return;
        this.player.move_x = 0;
        this.player.move_y = 0;

        if (eventsManager.action["up"]) {
            this.player.move_y = -2;
        }

        if (eventsManager.action["down"]) {
            this.player.move_y = 2;
        }
        if (eventsManager.action["left"]) {
            this.player.move_x = -2;
        }
        if (eventsManager.action["right"]) {
            this.player.move_x = 2;
        }
        if (this.player.pos_x<this.monster.pos_x){
            this.monster.move_x = -1;
        }
        if (this.player.pos_x>this.monster.pos_x){
            this.monster.move_x = 1;
        }
        if (this.player.pos_y<this.monster.pos_y){
            this.monster.move_y = -1;
        }
        if (this.player.pos_y>this.monster.pos_y){
            this.monster.move_y = 1;
        }

        //обновление информации по всем объектам на карте
        this.entities.forEach(function (e) {
            try {
                e.update();
            } catch(ex) {}
        });
        for(var i = 0; i < this.laterKill.length; i++) {
            var idx = this.entities.indexOf(this.laterKill[i]);
            if(idx > -1)
                this.entities.splice(idx, 1); // удаление из массива 1 объекта
        }
        if (this.laterKill.length > 0) // очистка массива laterKill
            this.laterKill.length = 0;
        mapManager.draw(ctx);
        this.draw(ctx);
    },
    draw: function (ctx) {
        for (var e = 0; e < this.entities.length; e++) {
            this.entities[e].draw(ctx);
        }
    },
    loadAll: function () {
        soundManager.init();
        spriteManager.loadAtlas("atlas.json", "spritesheet.png"); // загрузка атласа
        gameManager.factory['Player'] = Player; // инициализация фабрики
        gameManager.factory['monster'] = monster;
        gameManager.factory['fuel'] =Fuel;
        gameManager.factory['border'] =Border;
        mapManager.loadMap("maps/" + gameManager.curr_level + ".json"); // загрузка карты
        mapManager.parseEntities(); // разбор сущностей карты
        mapManager.draw(ctx); // отобразить карту
        eventsManager.setup(); // настройка событий
    },
    play: function () {
		docSetup();
		player = null;
		gameManager.entities = [];
		gameManager.factory = {};
		
		document.getElementById("lvl").innerHTML = "Уровень: " + gameManager.curr_level + "/" + gameManager.max_level;
		
		if(this.nickname.length == 0)
			this.nickname = document.getElementById("nick").value;
		
		if(this.nickname.length > 0){
			document.getElementById('myModal').style.display = 'none';
			document.getElementById('nick').style.display = 'none';
			document.getElementById('start').style.display = 'none';
				
			gameManager.loadAll();
			soundManager.playBG(true);
			updateWorld();
		}
    },
    kill: function (obj) {
        this.laterKill.push(obj);
    },
	gameEnd: function(gameover){
		document.getElementById('myModal').style.display = 'block';
		document.getElementById('menu').style.display = 'block';
        document.getElementById('winner').style.display = 'block';
        document.getElementById('score').innerHTML = 'Счёт: 0';
		
		if(gameover){
            scoreTable.add(gameManager.nickname, gameManager.score);
            document.getElementById("records").innerHTML = scoreTable.get();
		    document.getElementById('winner').innerHTML = 'Игра окончена! Счет: ' + gameManager.score;
			soundManager.playBG(false);
			soundManager.playSound(3);
		}else{

			scoreTable.add(gameManager.nickname, gameManager.score);
			soundManager.playBG(false);
			soundManager.playSound(4);
			document.getElementById("records").innerHTML = scoreTable.get();
            document.getElementById('winner').innerHTML = 'Вы выиграли! Счет: ' + gameManager.score;
			window.cancelAnimationFrame(ANIM);
		}

		gameManager.curr_level = 1;
		gameManager.score = 0;
	},
	levelUp: function(){
		this.curr_level++;
		this.play();
	}
};

var step = 1/60, dt = 0, now, last = timestamp();
function updateWorld() {
	now = timestamp();
    dt = dt + Math.min(1, (now - last) / 1000);
    while (dt > step) {
        dt = dt - step;
		
		ctx.clearRect(0, 0, 1195, 800);
        gameManager.update();
    }
	last = now;
	
	ANIM = requestAnimationFrame(updateWorld, canvas);
    
}