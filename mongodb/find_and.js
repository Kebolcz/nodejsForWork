/*
 * mongodb中多个or and查询
 * Created by 61841 on 2017/3/13.
 */
var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://url/appcan_mobileoa';


MongoClient.connect(mongourl, function (err, db) {
    var collections = db.collection('attbaseaddress');
    var res = [];
    //预设处置,方便测试
    var latitude = "34.253539",
        longitude = "107.476621";
    var range_lat = latitude.split(".")[0];
    var range_log = longitude.split(".")[0];

    var latitude_x = "",
        longitude_x = "";

    var EARTH_RADIUS = 6378137.0;    //单位M
    var PI = Math.PI;

    function getRad(d){
        return d*PI/180.0;
    }
    //mongodb中多个or and查询
    /*
     * db.example.find({
     *      '$or':[
     *         {'$and':[{'example.a':{'$gt':1}},{'example.b':{'$gt':2}}]},
     *         {'$and':[{'example.c':{'$gt':3}},{'example.d':{'$gt':4}}]}
     *      ]
     *  })
     *  
     *  参考blog:1>   http://blog.csdn.net/mcpang/article/details/7833805
     *           2>   http://www.cnblogs.com/knowledgesea/p/4634464.html
     */
    collections.find({'$and':[{'entity.latitude':{$gte:range_lat,$lte:String(Number(range_lat)+1)}},{'entity.longitude':{$gte:range_log,$lte:String(Number(range_log)+1)}}]}, {
        "entity" : 1
    }).toArray(function(err, results) {
        var isMatch = results.some(function(element) {
            latitude_x = element.entity.latitude;
            longitude_x = element.entity.longitude;

            var f = getRad((Number(latitude) + Number(latitude_x))/2);
            var g = getRad((Number(latitude) - Number(latitude_x))/2);
            var l = getRad((Number(longitude) - Number(longitude_x))/2);

            var sg = Math.sin(g);
            var sl = Math.sin(l);
            var sf = Math.sin(f);

            var s,c,w,r,d,h1,h2;
            var a = EARTH_RADIUS;
            var fl = 1/298.257;

            sg = sg*sg;
            sl = sl*sl;
            sf = sf*sf;

            s = sg*(1-sl) + (1-sf)*sl;
            c = (1-sg)*(1-sl) + sf*sl;

            w = Math.atan(Math.sqrt(s/c));
            r = Math.sqrt(s*c)/w;
            d = 2*w*a;
            h1 = (3*r -1)/2/c;
            h2 = (3*r +1)/2/s;

            console.log(d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg)));

            return (d*(1 + fl*(h1*sf*(1-sg) - h2*(1-sf)*sg)) < Number(element.entity.radius));
        });

        if(isMatch){
            console.log("push info to this one");
        }
    });
    /*
     *  一次连接中,程序处理完成后,需要关闭连接!执行操作后释放连接!不然会超过资源使用限制,导致服务器端口大量被占用.
     */
    db.close();
});