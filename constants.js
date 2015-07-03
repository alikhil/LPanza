/* Включение логов и дебаг функций*/
exports.debugMode = true;
/* Максимальное кол-во игроков на сервере*/
exports.serverMaxUsersCount = 200000;

/*Максимальное кол-во игроков в комнате */
exports.roomMaxUserCount = 20;
/*Время через которое происходят все расчеты на сервере*/
exports.serverTickDelay = 40;
/*Максимальная длина ника*/
exports.maxUserNameLength = 20;
/*Цвет фона[возможно устарел]*/
exports.backgroundColor = [144, 238, 144];
/*Кол-во ед жизней ианка*/
exports.tanksHP = 10;
/*Урон наносимый танку одним выстеролом*/
exports.damagePerShot = 1;
/*Размеры показываемой части карты*/
exports.showAreaWidth = 850;
exports.showAreaHeight = 400;

/*Размеры карты*/
exports.mapWidth = 1000;
exports.mapHeight = 1000;
/*Растояние от границ карты, где танки не могут появиться*/
exports.distanceFromWall = 30;



/*Размеры танка*/
exports.tankWidth = 50;
exports.tankLength = 50;
/*Радиус башни[устарело]*/
exports.tankTurretRadius = 9;
/*Параметры пушки[устарели-теперь пушка часть башни]*/
exports.tankGunWidth = 3;
exports.tankGunLength = 20;
/*Скорость танка*/
exports.tankSpeed = 5;
/*Очки за убийство*/
exports.scoreForKill = 10;
/*Очки за попадание*/
exports.scoreForHit = 1;
/*Максимальная длина объекта*/
exports.maxWidthLength = exports.tankWidth;
/*Время на перезарядку*/
exports.tankReloadTime = 2000;
/*Кол-во игроков показываемых в рейтинге*/
exports.ratingShowUsersCount = 5;
/*Параметры пули*/
exports.bulletDistanceFromGun = 1;
exports.bulletWidth = 4;
exports.bulletLength = 6;
exports.bulletSpeed = 15;
/*Размеры башни*/
exports.turretLength = 25;
exports.turretWidth = 50;
/*Размеры каретки в котором проверяются столкновения*/
exports.checkColisionAreaWidth = 100;
exports.checkColisionAreaHeight = 100;