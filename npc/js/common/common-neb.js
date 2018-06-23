var URL = "https://mainnet.nebulas.io";  //testnet : https://testnet.nebulas.io
var nebulas = require("nebulas"),
    neb = new nebulas.Neb(),
    api = neb.api,
    nonce = 0,
    gaslimit = 2000000,
    gasprice = 1000000,
    wei = 1000000000000000000,
    serialNumber,
    intervalQuery;
neb.setRequest(new nebulas.HttpRequest(URL));
var NebPay = require("nebpay");
var nebPay = new NebPay();
var dappAddr ="n1HZ8AGSEpZzbPHV8vLXitpsTDSJFaewb2h";
var contractAddr = "n1gNfTUthP2ia51pM5ZViV8qxUj7cgFqdv4";  //testnet : n1kxmVsFz5Ub7tKiU3JCQ35UJUUz3TdDbkQ
var curAddr;
//获取当前用户信息
function getUserInfo(self){
    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            if (e.data.data.account) {
                curAddr = e.data.data.account;
                if (curAddr){
                    getPersonalData(self, curAddr);
                }
            }
        }
    });
}

function queryData(addr, method, args, callback){
    neb.api.getAccountState(addr).then(function (resp) {
        nonce = parseInt(resp.nonce || 0) + 1;
        neb.api.call({
            from: addr,
            to: contractAddr,
            value: 0,
            nonce: nonce,
            gasPrice: gasprice,
            gasLimit: gaslimit,
            contract: {
                "function": method,
                "args": JSON.stringify(args)
            }
        }).then(function (resp) {
            if(resp.execute_err==""){
                callback(JSON.parse(resp.result));
            }else{
                // alert(resp.execute_err);
            }
        }).catch(function (err) {
            console.log(err);
        });
    }).catch(function (e) {
        console.log(e);
    });
}
function getPersonalData(self, addr){
    neb.api.getAccountState(addr).then(function (resp) {
        nonce = parseInt(resp.nonce || 0) + 1;
        var balance = resp.balance / wei;
        neb.api.call({
            from: addr,
            to: contractAddr,
            value: 0,
            nonce: nonce,
            gasPrice: gasprice,
            gasLimit: gaslimit,
            contract: {
                "function": "getUserInfo",
                "args": ''
            }
        }).then(function (resp) {
            if(resp.execute_err==""){
                self.account = JSON.parse(resp.result);
                self.account.balance = balance;
            }else{
                // alert(resp.execute_err);
            }
        }).catch(function (err) {
            console.log(err);
        });
    }).catch(function (e) {
        console.log(e);
    });
}
function getAllNASProducts(self){
    neb.api.getAccountState(dappAddr).then(function (resp) {
        nonce = parseInt(resp.nonce || 0) + 1;
        neb.api.call({
            from: dappAddr,
            to: contractAddr,
            value: 0,
            nonce: nonce,
            gasPrice: gasprice,
            gasLimit: gaslimit,
            contract: {
                "function": "getAllNASProducts",
                "args": ''
            }
        }).then(function (resp) {
            if(resp.execute_err==""){
                self.products = JSON.parse(resp.result);
                console.log(self.products);
            }else{
                alert(resp.execute_err);
            }
        }).catch(function (err) {
            console.log(err);
        });
    }).catch(function (e) {
        console.log(e);
    });
}
function getNewsLogs(self){
    neb.api.getAccountState(dappAddr).then(function (resp) {
        nonce = parseInt(resp.nonce || 0) + 1;
        neb.api.call({
            from: dappAddr,
            to: contractAddr,
            value: 0,
            nonce: nonce,
            gasPrice: gasprice,
            gasLimit: gaslimit,
            contract: {
                "function": "getNewsLogs",
                "args": ''
            }
        }).then(function (resp) {
            if(resp.execute_err==""){
                self.news = JSON.parse(resp.result);
                console.log(self.news);
            }else{
                alert(resp.execute_err);
            }
        }).catch(function (err) {
            console.log(err);
        });
    }).catch(function (e) {
        console.log(e);
    });
}
//出价
function offerNAS(self, id, price){
    if (!curAddr){
        $('#priceModal').modal('hide');
        alert("请在WebExtensionWallet插件（<a target='_blank' href='https://github.com/ChengOrangeJu/WebExtensionWallet'>点击下载</a>）中选择钱包文件，然后刷新页面，系统会自动识别您的账户信息");
        return;
    }
    queryData(dappAddr, "getProductById", [id], function (data) {
        console.log(data);
        if (price <= data.nowPrice){
            alert("出价必须大于当前价格");
            return;
        }else if (getRestTime(data.endTime) <= 0){
            $('#priceModal').modal('hide');
            alert("此商品已经拍卖完成");
            return;
        }else if (curAddr === data.winner){
            $('#priceModal').modal('hide');
            alert("不能连续拍卖相同的商品");
            return;
        }
        serialNumber = nebPay.call(contractAddr,"0","offerNAS",JSON.stringify([id, price]),{
            listener : function (resp) {
                //延迟5秒执行
                intervalQuery = setInterval(function () {
                    queryResultInfo();
                }, 15000);
            }
        });
        $("#dealPrice").val(null);
        $('#priceModal').modal('hide');
    })
}
//领奖
function acceptProduct(self, id, address, phone){
    if (!curAddr){
        $('#priceModal').modal('hide');
        alert("请在WebExtensionWallet插件（<a target='_blank' href='https://github.com/ChengOrangeJu/WebExtensionWallet'>点击下载</a>）中选择钱包文件，然后刷新页面，系统会自动识别您的账户信息");
        return;
    }
    queryData(dappAddr, "getProductById", [id], function (data) {
        console.log(data);
        if (getRestTime(data.endTime) > 0){
            $('#priceModal').modal('hide');
            alert("拍卖还没有结束");
            return;
        }else if (curAddr != data.winner){
            $('#priceModal').modal('hide');
            alert("您不是大赢家");
            return;
        }else if (data.status === PRODUCT_STATUS_FINISH){
            $('#priceModal').modal('hide');
            alert("您已经领过奖啦");
            return;
        }
        var api = "acceptProduct";
        var price = data.nowPrice;
        if (data.ptype === "NPC"){
            api = "acceptNPCProduct";
            price = 0;
        }
        serialNumber = nebPay.call(contractAddr,price,api,JSON.stringify([id, address, phone]),{
            listener : function (resp) {
                //延迟5秒执行
                intervalQuery = setInterval(function () {
                    queryResultInfo();
                }, 15000);
            }
        });

        $("#address").val(null);
        $("#phone").val(null);
        $('#priceModal').modal('hide');

    })
}
//获取当前用户竞拍
function getUserWinProducts(self){
    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            if (e.data.data.account) {
                curAddr = e.data.data.account;
                if (curAddr){
                    queryData(curAddr, "getUserWinProducts", [], function (data) {
                        self.jproducts = data;
                    })
                }
            }
        }
    });
}
//获取当前用户竞拍
function getUserPubProducts(self){
    window.postMessage({
        "target": "contentscript",
        "data": {},
        "method": "getAccount",
    }, "*");
    window.addEventListener('message', function (e) {
        if (e.data && e.data.data) {
            if (e.data.data.account) {
                curAddr = e.data.data.account;
                if (curAddr){
                    queryData(curAddr, "getUserPubProducts", [], function (data) {
                        self.pproducts = data;
                    })
                }
            }
        }
    });
}
//获取NPC拍卖商品
function getAllNPCProducts(self){
    queryData(dappAddr, "getAllNPCProducts", [], function (data) {
        self.products = data;
    })
}
function getNPCNewsLogs(self){
    queryData(dappAddr, "getNPCNewsLogs", [], function (data) {
        self.news = data;
    })
}
//出价NPC
function offerNPC(self, id, price){
    if (!curAddr){
        $('#priceModal').modal('hide');
        alert("请在WebExtensionWallet插件（<a target='_blank' href='https://github.com/ChengOrangeJu/WebExtensionWallet'>点击下载</a>）中选择钱包文件，然后刷新页面，系统会自动识别您的账户信息");
        return;
    }
    queryData(dappAddr, "getProductById", [id], function (data) {
        console.log(data);
        if (price <= data.nowPrice){
            alert("出价必须大于当前价格");
            return;
        }else if (getRestTime(data.endTime) <= 0){
            $('#priceModal').modal('hide');
            alert("此商品已经拍卖完成");
            return;
        }else if (curAddr === data.winner){
            $('#priceModal').modal('hide');
            alert("不能连续拍卖相同的商品");
            return;
        }
        serialNumber = nebPay.call(contractAddr,"0","offerNPC",JSON.stringify([id, price]),{
            listener : function (resp) {
                //延迟5秒执行
                intervalQuery = setInterval(function () {
                    queryResultInfo();
                }, 15000);
            }
        });
        $("#dealPrice").val(null);
        $('#priceModal').modal('hide');
    })
}
//新建拍品
function addProduct(data){
    serialNumber = nebPay.call(contractAddr,0,"addProduct",JSON.stringify([data]),{
        listener : function (resp) {
            //延迟5秒执行
            intervalQuery = setInterval(function () {
                queryResultInfo();
            }, 15000);
        }
    });
}



// 根据交易流水号查询执行结果数据
function queryResultInfo() {
    nebPay.queryPayInfo(serialNumber)
        .then(function (resp) {
            console.log(resp);
            var respObject = JSON.parse(resp);
            if(respObject.code === 0){
                console.log(resp);
                location.reload();
                clearInterval(intervalQuery);
            }
        })
        .catch(function (err) {
            console.log(err);
        })
}