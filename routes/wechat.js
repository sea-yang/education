import express from 'express';
import crypto from 'crypto';
import fetch from 'isomorphic-fetch';
import request from 'request';
import xml2json from 'xml2json';

const router = express.Router();

// 微信配置
const config = {
    baseUrl: 'http://w.jenniferstudio.cn',
    redirectUrl: 'http://w.jenniferstudio.cn/wechat/redirect',
    token: 'seayangtoken',
    appId: 'wx959feca69d5ba361',
    appSecret: 'a54c117815bb10944bc60125f8910cee',
    encodingAESKey: 'QHhz7I8hHAGafbNxx40MLMtE2jOcfBJ6Ctcg1bpDXsM',
    mchId: '1354735602', //微信支付分配的商户号
    apiKey: 'ijamao9034903ksadkdsadjaklaDaADA'
};

function sha1(str){
  let md5sum = crypto.createHash("sha1");
  md5sum.update(str);
  str = md5sum.digest("hex");
  return str;
}

//创建签名
function createSignature(url, ticketObj) {
  const noncestr = createNonceStr();
  // noncestr=Wm3WZYTPz0wzccnW
  // jsapi_ticket=sM4AOVdWfPE4DxkXGEs8VMCPGGVi4C3VM0P37wVUCFvkVAy_90u5h9nbSlYy3-Sl-HhTdfl2fzFy1AOcHKP7qg
  // timestamp=1414587457
  // url=http://mp.weixin.qq.com?params=value
  let sha1String = `jsapi_ticket=${ticketObj.ticket}&noncestr=${noncestr}&timestamp=${ticketObj.timestamp}&url=${url}`;
  return {
    signature: sha1(sha1String),
    ticket: ticketObj.ticket,
    timestamp: ticketObj.timestamp,
    noncestr: noncestr,
    url: url
  }
}

// 随机字符串产生
function createNonceStr() {
	return Math.random().toString(36).substr(2, 15);
};

// 时间戳产生
function createTimeStamp() {
	return parseInt(new Date().getTime() / 1000);
};

// 订单号产生
function createOrderId() {
  return createTimeStamp() + '' + Math.ceil(Math.random()*10000);
}

//对象转字符串
function raw(obj) {
  var keys = Object.keys(obj);
  keys = keys.sort()
  var newObj = {};
  keys.forEach(function (key) {
    newObj[key] = obj[key];
  });
  var string = '';
  for (var k in newObj) {
    string += '&' + k + '=' + newObj[k];
  }
  return string.substr(1) + '&key=' + config.apiKey; //拼接API密钥
}

//解析XML node
function getXMLNodeValue(nodeName, xml){
  var tmp = xml.split('<'+nodeName+'>');
  var _tmp = tmp[1].split('</'+nodeName+'>');
  return _tmp[0];
}

// 创建微信支付sign
function createWxPaySign(order) {
  return crypto.createHash('md5').update(raw(order), 'utf8').digest('hex').toUpperCase();
}
// 微信接入验证
// http://mp.weixin.qq.com/wiki/8/f9a0b8382e0b77d87b3bcc1ce6fbc104.html
// 参数        描述
// signature   微信加密签名，signature结合了开发者填写的token参数和请求中的timestamp参数、nonce参数。
// timestamp	 时间戳
// nonce	     随机数
// echostr	   随机字符串
router.get('/validate', (req, res) => {
  // console.log('weixin validate...');
  const signature = req.query.signature;
  const timestamp = req.query.timestamp;
  const nonce = req.query.nonce;
  const echostr = req.query.echostr;

  // 将token、timestamp、nonce三个参数进行字典序排序
  let oriArray = new Array();
  oriArray[0] = config.token;
  oriArray[1] = timestamp;
  oriArray[2] = nonce;
  oriArray.sort();

  let original = oriArray.join('');
  let scyptoString = sha1(original);
  if (signature == scyptoString){
    res.end(echostr);
  } else {
    res.end('false');
  }
});

let cachedToken = null;
const getToken = async () => {
  const timestamp = createTimeStamp();
  if (cachedToken) {
    if (timestamp < (cachedToken.timestamp + cachedToken.expires_in - 1000)) {
      return cachedToken;
    }
  }
  try {
    let response = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`);
    const json = await response.json();
    json.timestamp = timestamp;
    cachedToken = json;
    return cachedToken;
  } catch (e) {
    console.log('get token error : ', e)
    return null
  }
}

//获取access_token
router.get('/token', async (req, res) => {
  const token = await getToken()
  if (token) {
    res.json(token);
  } else {
    res.json('false');
  }
})

let cachedTicket = null;
const getTicket = async () => {
  const timestamp = createTimeStamp();
  if (cachedTicket) {
    if (timestamp < (cachedTicket.timestamp + cachedTicket.expires_in - 1000)) {
      return cachedTicket;
    }
  }
  try {
    const token = await getToken()
    if (!token || !token.access_token) {
      return null
    }
    const response = await fetch(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token.access_token}&type=jsapi`);
    let json = await response.json();
    json.timestamp = timestamp;
    cachedTicket = json;
    return cachedTicket;
  } catch (e) {
    console.log('get ticket error : ', e)
    return null;
  }
}
//获取ticket
router.get('/ticket', async (req, res) => {
  const ticket = await getTicket()
  if (ticket) {
    res.json(ticket);
  } else {
    res.json('false');
  }
});

// const cachedSignatures = {};
//获取signature
router.get('/signature', async (req, res) => {
  // 如果ticket失效
  const ticket = await getTicket()
  if (!ticket) {
    res.json('false');
  }

  const url = req.query.url || config.baseUrl; // || req.originalUrl;
  // let signatureObj = cachedSignatures[url];
  // if (signatureObj && (signatureObj.ticket == cachedTicket.ticket)) {
  //   return res.json(signatureObj);
  // }
  //重新生成签名
  const signatureObj = createSignature(url, ticket);
  // console.log('url:', url);
  // console.log(signatureObj);
  // cachedSignatures[url] = signatureObj;
  res.json(signatureObj);
});

//微信登录
router.get('/login', (req, res) => {
    if (/MicroMessenger/i.test(req.get('User-Agent'))) {
        let referer = req.query.referer || req.cookies.referer;
        if (referer) {
          res.cookie('referer', decodeURIComponent(referer), {domain:res.locals.domain});
        }
        let redirectUrl = encodeURIComponent(config.redirectUrl);
        return res.redirect(`https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appId}&redirect_uri=${redirectUrl}&response_type=code&scope=snsapi_userinfo&state=1#wechat_redirect`);
    }
    return res.json('only support wechat');
});

//微信跳转, /wechat/redirect?code=021rUtAa2OqSlC0Cs3Ba2NPtAa2rUtA3&state=1
router.get('/redirect', async (req, res) => {
  try {
    // 通过code换取网页授权access_token
    let response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appId}&secret=${config.appSecret}&code=${req.query.code}&grant_type=authorization_code`);
    let json = await response.json();
    const { openid, access_token } = json;
    // 拉取用户信息
    response = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`);
    json = await response.json();
    const { nickname } = json;
    // 判断用户是否绑定
    response = await fetch(`${config.baseUrl}/webservice/account/is_binding?openId=${openid}`);
    json = await response.json();

    if (json.errno === 0) {
      // 已绑定
      res.cookie('openid', openid, { expires: new Date(Date.now() + 900000000) });
      res.cookie('nickname', nickname, { expires: new Date(Date.now() + 900000000) });
      // console.log('refer: ', req.cookies.referer);
      res.redirect(req.cookies.referer || config.baseUrl);

    } else if (json.errno === 1) {
      // 未绑定，跳转绑定页面
      res.cookie('openid', openid, { expires: new Date(Date.now() + 900000000) });
      res.cookie('nickname', nickname, { expires: new Date(Date.now() + 900000000) });
      res.redirect('/bind');
    } else {
      res.end(json.errmsg || '未知错误');
    }
  } catch (e) {
    console.log(e);
    res.json('server error.');
  }

});

//微信支付申请
router.get('/pay/request/:openId/:classId', async (req, res) => {
  try {
    let order = {
      appid: config.appId,
      attach: req.params.classId,
      body: '班级学费支付',
      mch_id: config.mchId,
      nonce_str: createNonceStr(),
      notify_url: 'http://w.jenniferstudio.cn/wechat/pay/notify',
      openid: req.params.openId,
      out_trade_no: createOrderId(),
      spbill_create_ip: '121.225.151.4',
      total_fee: 1,
      trade_type: 'JSAPI'
    }
    order.sign = createWxPaySign(order);

    let formData = '<xml>';
    for (var key in order) {
      formData += '<' + key + '>' + order[key] + '</' + key + '>';
    }
    formData += '</xml>';

    // let response = await fetch(`https://api.mch.weixin.qq.com/pay/unifiedorder`, {
    //   method: 'POST',
    //   body: formData
    // });
    // console.log(response);
    request({url:'https://api.mch.weixin.qq.com/pay/unifiedorder', method:'POST',body: formData},function(err,response,body){
      if (!err && response.statusCode == 200){
        var prepay_id = getXMLNodeValue('prepay_id',body.toString("utf-8"));
        var tmp = prepay_id.split('[');
        var tmp1 = tmp[2].split(']');
        var resJson = {
          appId: config.appId,
          timeStamp: createTimeStamp() + '',
          nonceStr: createNonceStr(),
          package: 'prepay_id=' + tmp1[0],
          signType: 'MD5'
        };
        resJson.paySign = createWxPaySign(resJson);
        res.json(resJson);
      }
    });

    // res.end('success');
  } catch (e) {
    console.log(e);
    res.json('server error.');
  }
});

//微信支付结果通知
// {
//   "xml": {
//     "appid": "wx95013eaa68c846c7",
//     "attach": "班级支付",
//     "bank_type": "CFT",
//     "cash_fee": "1",
//     "fee_type": "CNY",
//     "is_subscribe": "Y",
//     "mch_id": "1354735602",
//     "nonce_str": "nbm1f40qid5f80k",
//     "openid": "oUoJLv6jTegVkkRhXBnhq5XSvvBQ",
//     "out_trade_no": "14668761006594",
//     "result_code": "SUCCESS",
//     "return_code": "SUCCESS",
//     "sign": "FA7B5275162CB3DD2A3939EB317BCA0B",
//     "time_end": "20160626013507",
//     "total_fee": "1",
//     "trade_type": "JSAPI",
//     "transaction_id": "4002532001201606267890120919"
//   }
// }
router.post('/pay/notify', async (req, res) => {
  const success = '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
  const fail = '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[FAIL]]></return_msg></xml>';
  req.rawBody = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });
  req.on('end', async () => {
    try {
      let json = xml2json.toJson(req.rawBody, {object: true});
      if (json['xml'] && json['xml']['return_code'] == 'SUCCESS') {
        let response = await fetch('http://w.jenniferstudio.cn/webservice/studentnew/order_success', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=utf-8'
          },
          body: JSON.stringify(json['xml'])
        });
        let resJson = await response.json();
        // console.log('resJson: ', resJson);
        res.end(success);
      } else {
        console.log('fail pay notify', json);
        res.end(fail);
      }
    } catch (e) {
      console.log(e);
      res.end(fail);
    }
  });

});


//微信模板消息
router.get('/postmessage', async (req, res) => {
  var jsonObj = {
    touser: 'oUoJLv6jTegVkkRhXBnhq5XSvvBQ',
    template_id : 'qLlauF3scaD5ZCC6iQa9ZXdFgtFST51Rvovlca5-v-w',
    url: 'http://w.jenniferstudio.cn/notice/list',
    topcolor: '#FF0000',
    data: {
      first: {
        value: '班级通知'
      },
      keyword1: {
        value: 'xxx'
      },
      keyword2: {
        value: 'xxx'
      },
      keyword3: {
        value: 'xxx'
      },
      keyword4: {
        value: 'xxx'
      },
      remark: {
        value: 'xxx'
      }
    }
  };
  const token = await getToken()

  let response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8'
    },
    body: JSON.stringify(jsonObj)
  });
  let json = await response.json();
  return res.json(json);
});

export default router;
