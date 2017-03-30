/*
 * 2017-03-01
 * 参考Tip1:
 *  eventProxy:所有异步请求全部返回后,再对获取的所有结果进行统一操作.
 * Tip2:
 *  闭包,封装变量为私有变量,延续局部变量的寿命.
 *  
 */
var MongoClient = require('mongodb').MongoClient;
var getconfigFn = require("../config.js").appcan;
var config = {};
var mongourl = '';

var eventproxy = require('eventproxy');

Date.prototype.format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

function run(Param, Robot, Request, Response, IF) {
    //根据runtime获取不同的系统配置文件
    config = getconfigFn(global.runtime);
    //获取配置的mongourl
    mongourl = config.mongourl;
    console.log('*****mongourl********: ' + mongourl);
    var args = Param.fields || Param.params;
    Response.setHeader('Content-type', 'application/json;charset=utf-8');

    console.log('args', args);

    if (runs[args.method]) {
        runs[args.method](Param, Robot, Request, Response, IF);
    } else {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>> run:');
        console.log(args);
        Response.end(args);
    }
}

var runs = {
    'getAttDetails' : function(Param, Robot, Request, Response, IF) {
        var args = Param.fields || Param.params;
        var self = this;
        MongoClient.connect(mongourl, function(err, db) {
            var collections = db.collection('attendance');
            var res = [];
            collections.find({}, {
                "entity" : 1,
                "userId" : 1
            }).toArray(function(err, results) {
                results.map(function(element) {
                    var req = args.date.split('-');
                    var len = req.length;
                    for (var i = 0; i < len; i++) {
                        if (Number(req[i]) < 10) {
                            req[i] = Number(req[i]);
                        }
                    }
                    if ( typeof (element.entity[req[0]]) != "undefined" && typeof (element.entity[req[0]][req[1]]) != "undefined" && typeof (element.entity[req[0]][req[1]][req[2]]) != "undefined") {
                        res.push({
                            userId : element.userId,
                            inTime : (element[0].entity[req[0]][req[1]][req[2]].inTime).format("yyyy-MM-dd hh:mm:ss"),
                            outTime : (element[0].entity[req[0]][req[1]][req[2]].outTime).format("yyyy-MM-dd hh:mm:ss")
                        });
                    }
                });

                Response.end(JSON.stringify(res));
            });
        });
    },
    'getAttDetailsById' : function(Param, Robot, Request, Response, IF) {
        var args = Param.fields || Param.params;
        var self = this;
        MongoClient.connect(mongourl, function(err, db) {
            var collections = db.collection('attendance');
            var res = [];
            var userId = args.userId.split(',');

            var ep = new eventproxy();

            ep.after('getAttDetails', userId.length, function(list) {
                // 在所有文件的异步执行结束后将被执行
                // 所有文件的内容都存在list数组中
                list.forEach(function(element) {
                    var req = args.date.split('-');
                    var len = req.length;
                    for (var i = 0; i < len; i++) {
                        if (Number(req[i]) < 10) {
                            req[i] = Number(req[i]);
                        }
                    }
                    if(typeof(element[0]) != "undefined" && typeof(element[0].entity) != "undefined"){
                        if ( typeof (element[0].entity[req[0]]) != "undefined" && typeof (element[0].entity[req[0]][req[1]]) != "undefined" && typeof (element[0].entity[req[0]][req[1]][req[2]]) != "undefined") {
                            res.push({
                                userId : element[0].userId,
                                inTime : (element[0].entity[req[0]][req[1]][req[2]].inTime).format("yyyy-MM-dd hh:mm:ss"),
                                outTime : (element[0].entity[req[0]][req[1]][req[2]].outTime).format("yyyy-MM-dd hh:mm:ss")
                            });
                        }else{
                            res.push({
                                userId: element[0].userId,
                                inTime: null,
                                outTime: null
                            });
                        }
                    }else{
                        res.push({
                            userId: element[0].userId,
                            inTime: null,
                            outTime: null
                        });
                    }
                });
                Response.end(JSON.stringify(res));
            });
            
            for (var i = 0; i < userId.length; i++) {
                var ID = userId[i];
                //闭包,封装userId变量,延续局部变量的寿命.
                (function(userId){
                    collections.find({"userId": userId}).toArray(function (err, result) {
                        if(typeof(result[0]) == 'undefined'){
                            result = [{"userId" : userId}];
                        }
                        // 触发结果事件
                        ep.emit('getAttDetails', result);
                    });
                })(ID);
            }
        });
    }
}
exports.Runner = run;
