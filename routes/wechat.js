const express = require("express");
const router = express.Router();
const jsSHA = require("jssha");
const request = require('request'); //http请求模块
const xmlparser = require("express-xml-bodyparser");

/**
 * 授权验证
 */
router.get("/", function(req, res, next) {
    const token = '123456789'
        //"这里是你的自定义Tken，与公众平台的Token相对应，不然会验证不成功";
        //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
    let signature = req.query.signature, //微信加密签名
        timestamp = req.query.timestamp, //时间戳
        nonce = req.query.nonce, //随机数
        echostr = req.query.echostr; //随机字符串
    //2.将token、timestamp、nonce三个参数进行字典序排序
    let array = [token, timestamp, nonce];
    array.sort();

    //3.将三个参数字符串拼接成一个字符串进行sha1加密
    let tempStr = array.join("");
    let shaObj = new jsSHA("SHA-1", "TEXT");
    shaObj.update(tempStr);
    let scyptoString = shaObj.getHash("HEX");

    //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if (signature === scyptoString) {
        console.log("验证成功");
        res.send(echostr);
    } else {
        console.log("验证失败");
        res.send("success");
    }

});

// router.post('/', xmlparser({ trim: false, explicitArray: false }), function(req, res, next) {
//     let data = `<xml><ToUserName>${req.body.xml.fromusername}</ToUserName> <FromUserName>${req.body.xml.tousername}</FromUserName> <CreateTime>${req.body.xml.createtime}</CreateTime> <MsgType>${req.body.xml.msgtype}</MsgType> <Content>你好啊！</Content></xml>`
//     res.writeHead(200, { 'Content-Type': 'application/xml' });
//     res.end(data);
// });


/**
 * [创建请求微信网页授权接口链接]
 */

router.get('/sendMsg', function(req, res) {
    getAccessToken("")
});

/**
 * 获取access_token
 *  @param  { string } openid [发送模板消息的接口需要用到openid参数]
 */
function getAccessToken() {
    const appid = "wx75a1fcf3e00e2638";
    const secret = "a9d06e6029605807b9b078d46eaff2dc ";
    const grant_type = "client_credential";
    // const url =
    //     `https://api.weixin.qq.com/cgi-bin/token?grant_type=${grant_type}&appid=${appid}&secret=${secret}`;
    const url =
        "https://api.weixin.qq.com/cgi-bin/token?grant_type=" + grant_type + "&appid=" + appid + "&secret=" + secret;
    console.log(url)
    const openid = 'oIL9_6iHd2m6yN_fau98Wzq-CbxY';
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(JSON.parse(body))

            const access_token = JSON.parse(body).access_token;
            sendTemplateMsg(openid, access_token); //获取access_token成功后调用发送模板消息的方法

        } else {
            throw 'update access_token error';
        }
    });


}


/**
 * 发送模板消息
 * @param  { string } openid [发送模板消息的接口需要用到openid参数]
 * @param  { string } access_token [发送模板消息的接口需要用到access_token参数]
 */

function sendTemplateMsg(openid, access_token) {
    console.log("发送模板消息")
        // 
        // const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${access_token}`; //发送模板消息的接口
    const url = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + access_token; //发送模板消息的接口
    console.log(url)

    const requestData = { //发送模板消息的数据
        touser: "oIL9_6iHd2m6yN_fau98Wzq-CbxY",
        template_id: "5PlP4czkxUpAyervWg2EpKBET7g_gEq9iHc0VlEker8",
        url: "https://www.baidu.com",
        data: {
            first: {
                value: "您有条消息需处理",
                color: "#173177"
            },
            keyword1: {
                value: "请你唱首歌",
                color: '#1d1d1d'
            },
            keyword2: {
                value: "2021.4.26",
                color: '#1d1d1d'
            },
            keyword3: {
                value: "唱《我和你》",
                color: "#1d1d1d"
            },
            remark: {
                value: "加油奥",
                color: '#173177'
            }
        }
    };
    console.log(requestData)
    request({
            url: url,
            method: 'post',
            body: JSON.stringify(requestData),
            headers: {
                "content-type": "application/json",
            }
        },
        function(error, response, body) {
            // console.log(response)
            // console.log(error)
            // console.log(body)
            if (!error && response.statusCode == 200) {
                console.log('模板消息推送成功');
            }
        });
};

router.post('/', xmlparser({ trim: false, explicitArray: false }), function(req, res, next) {
    if (!res || !res.body || !res.body.xml) {
        res.send('success');
        return;
    }
    console.log("各类消息推送" + JSON.stringify(req.body.xml))
    let xmlResult = req.body.xml;
    console.log("" + xmlResult.msgtype + "---" + xmlResult.event)
    if (xmlResult.msgtype == "event") {
        //接收事件推送或者是模板消息发送推送
        if (xmlResult.event == "subscribe") {
            console.log("用户关注事件")
            handleAutoReply(res, xmlResult, "谢谢您的关注")
        } else if (xmlResult.event == "TEMPLATESENDJOBFINISH") {
            console.log("发送模板消息推送" + xmlResult.status)
            res.send('success');
        }
    } else {
        // msgtype：text;  image:图片
        //接收普通消息或者是被动回复用户信息
        handleAutoReply(res, xmlResult, "你好啊")
    }

});

function handleAutoReply(res, xmlResult, content) {
    // messageMap是含有关键词回复key-value的json，根据不同的关键词，向用户发送不同消息
    let data = `<xml><ToUserName>${xmlResult.fromusername}</ToUserName> <FromUserName>${xmlResult.tousername}</FromUserName> <CreateTime>${xmlResult.createtime}</CreateTime> <MsgType>${xmlResult.msgtype}</MsgType> <Content>${content}</Content></xml>`
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end(data);
}

module.exports = router;