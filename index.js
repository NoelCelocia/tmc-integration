const express = require('express');
const asyncHandler = require('express-async-handler');

var request = require('request');
require('custom-env').env('dev');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
require("tls").DEFAULT_MIN_VERSION = "TLSv1";

if (process.env.NODE_ENV !== 'production') { require ('custom-env').env('dev') }
process.on('uncaughtException', function (err) {
	console.error(err);
	console.log("Node NOT Exiting...");
});

const app = express();
//const port = process.env.PORT || 3001;


const base64XSJSCredential = Buffer.from(process.env.XSJS_USERNAME + ":" + process.env.XSJS_PASSWORD).toString('base64');

// app.use(cors());
app.use(express.json());

let loginSAP = async () => {
    var loginOptionSAP = {};
    loginOptionSAP.method = "POST";
    loginOptionSAP.url = `${process.env.SL_BASE_URL}/Login`;
    loginOptionSAP.headers = {
        "CompanyDB": process.env.SL_DB,
        "Password": process.env.SL_PASSWORD,
        "UserName": process.env.SL_USERNAME
    };

    return new Promise((resolve, reject) => {
        request(loginOptionSAP, (logerror, logresponse) => {
            if (logerror) resolve(logerror);
            resolve(logresponse.headers["set-cookie"]);
        });
    })
}

let getForSync = async (cookie, body) => {
    var postAROption = {};
    postAROption.method = "GET";
    postAROption.url = `${process.env.XSJS_BASE_URL}/app_xsjs/ExecQuery.xsjs?dbName=${process.env.SL_DB}&procName=spAppBPMaster`;
    postAROption.headers = {
        "Content-Type": "application/json",
        // "Cookie": cookie,
        "Authorization": 'Basic ' + base64XSJSCredential
    };

    return new Promise((resolve, reject) => {
        request(postAROption, (error, response) => {
            if (error) {
                reject("Reject on getForSync");
            }
            resolve(JSON.parse(response.body));
        });
    })
}

//A/R Invoice Posting in SAP
app.post('/getMasterData', asyncHandler(async (req, res, next) => {
    try {
        
        console.log("Getting Data...");
        // let gotCookie = await loginSAP();
        let resultAR = await getForSync();
        var oRecord = [];
        //var oRecordDetails = [];

        for (let p = 0; p < resultAR.length; p++) {
            var oBP = {};
            var oBPContDetails = [];
            var oBPAddrDetails = [];

            oBP.code = resultAR[p].code;
            oBP.name = resultAR[p].name;
            oBP.description = resultAR[p].description;
            oBP.vendortype = resultAR[p].vendortype;
            oBP.vendorclass = resultAR[p].vendorclass;
            oBP.creditterm = resultAR[p].creditterm;
            oBP.contactpersonname = resultAR[p].contactpersonname;
            oBP.businessregno = resultAR[p].businessregno;
            oBP.remarks = resultAR[p].remarks;
            oBP.leadtime = resultAR[p].leadtime;
            oBP.activefrom = resultAR[p].activefrom;
            oBP.activeto = resultAR[p].activeto;
            oBP.CreatedBy = resultAR[p].CreatedBy;
            oBP.CreatedDat = resultAR[p].CreatedDat;
            oBP.statusflag = resultAR[p].statusflag;
            oBP.orgcode = resultAR[p].orgcode;

            var oContactDetails = {};
            oContactDetails.contactperson = resultAR[p].orgcode;
            oContactDetails.mobilephone = resultAR[p].orgcode;
            oContactDetails.emailid = resultAR[p].orgcode;
            oContactDetails.division = resultAR[p].orgcode;
            oContactDetails.faxnumber = resultAR[p].orgcode;
            oBPContDetails.push(JSON.parse(JSON.stringify(oContactDetails)));
            oBP.contact = JSON.parse(JSON.stringify(oBPContDetails).replace("[", "").replace("]", ""));
          
            var oAddDetails = {};
            oAddDetails.addressname = resultAR[p].addressname;
            oAddDetails.area = resultAR[p].area;
            oAddDetails.city = resultAR[p].city;
            oAddDetails.sate = resultAR[p].sate;
            oAddDetails.country = resultAR[p].country;
            oAddDetails.zipcode = resultAR[p].zipcode;
            oBPAddrDetails.push(JSON.parse(JSON.stringify(oAddDetails)));
            oBP.address = JSON.parse(JSON.stringify(oBPAddrDetails).replace("[", "").replace("]", ""));

            oRecord.push(JSON.parse(JSON.stringify(oBP)));


        }
        res.status(200).send(JSON.stringify(oRecord));
       // res.send(JSON.stringify(oRecord));
    } catch (e) {
        return next(e);
    }
}))



let updateBP = async (cookie, body) => {
    var updateBPOption = {};
    updateBPOption.method = "POST";
    updateBPOption.url = `${process.env.SL_BASE_URL}/BusinessPartners(${body.CardCode})`;
    updateBPOption.headers = {
        "Content-Type": "application/json",
        "Cookie": cookie
    };
    updateBPOption.body = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        request(updateBPOption, (err, resp) => {
            if (err) resolve({
                error: "-1005",
                errorDesc: JSON.stringify(err)
            });
            if (JSON.parse(resp.body).error) {
                console.log(JSON.stringify(JSON.parse(resp.body)));
                resolve({
                    error: "-1006",
                    errorDesc: JSON.stringify(JSON.parse(resp.body).error)
                });
            } else {
                resolve(resp);
            }

        })
    })
}

//Update BP sync Status in SAP
app.post('/updateBP', asyncHandler(async (req, res, next) => {
    try {
        
        console.log("Logging in...");
        let gotCookie = await loginSAP();
        var oBP = {};
        oBP.CardCode = req.body.CardCode;
        oBP.U_APP_IsSync = req.body.U_APP_IsSync;
       
        console.log(JSON.stringify(oBP))
        let resultBP = await updateBP(gotCookie, oBP);
        res.send(JSON.stringify(resultBP));
    } catch (e) {
        return next(e);
    }
}))



app.get('/Connected', (request, response) => {
    response.status(200).send("true"); 
    

});
//app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
app.set( 'port', ( process.env.PORT || 3000 ));
app.listen( app.get( 'port' ), function() {
	console.log( 'Node server is running on port ' + app.get( 'port' ));
	});