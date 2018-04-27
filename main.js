const puppeteer = require('puppeteer');
const d3 = require('d3-dsv')
const prompt = require('prompt')
const fs = require('fs')
const path = require('path')
const report = []
var signUps;
var coursesTop;
var SUBDOMAIN

const sels = {
    loginUsername: "#userName",
    loginPassword: "#password",
    loginButton: "button[primary]",
    
    courseSearchButton: "d2l-icon[icon$=classes]",
    courseSeacrch: "input[type=search]",
    results: ".d2l-datalist-container ul",
    result: ".d2l-datalist-item-actioncontrol",
    
    catagoriesSelect: "[name=category]",
    catagoriesOptions: "[name=category] > option",
    menuDropdown: ".bsi-button-menu",
    enrollUsers: "li[role=presentation]:last-child a",
    
    searchStudent: "input[type=text]",
    numResults: ".d2l-msg-container-text strong",
    checkbox: "input[type=checkbox][onclick*='EnrollmentChange']",
    save: 'button[primary]',
}

async function login(page,auth){
    await page.goto(`https://${SUBDOMAIN}.brightspace.com/d2l/login?noredirect=true`)
    await page.type(sels.loginUsername,auth.username),
    await page.type(sels.loginPassword,auth.password)
    await page.click(sels.loginButton)
    await Promise.all([
        page.waitForSelector(sels.courseSearchButton),
        page.waitForNavigation()
    ])
}

async function selectVirtualGathering(page){
    let catagories = await page.$$eval(sels.catagoriesOptions, options => [...options].map(option => ({
        value: option.value,
        name: option.innerHTML,
        selected: option.selected
    })))
    let VG = catagories.filter(c => c.name.match(/Virtual Gathering/i))[0]
    if(!VG){
        throw new Error("No Virtual Gathering Catagory")
    }
    if(!VG.selected){
        await Promise.all([
            page.waitForNavigation(),
            page.select(sels.catagoriesSelect,VG.value)
        ])
    }
}

async function selectStudent(page,name){
    //clean out the box first, if there are muntipule students in the same class then the next ones break because the previous persons name is in there

    await page.evaluate(()=>document.querySelector('input[type=text]').value = "")
    // type the name in
    await page.type(sels.searchStudent,name),

    //click search and wait for the page to load
    await Promise.all([
        page.waitForNavigation(),
        page.click('.vui-input-search-button')
    ])
    
    page.waitForSelector(sels.numResults)
    
    let numResults = await page.$eval(sels.numResults, e => e.innerHTML)
    if(numResults != 1){
        throw new Error(`Couldn't find ${name} or more than one`)
    }
    
    let isChecked = await page.$eval(sels.checkbox, checkbox => checkbox.checked)
    
    if(!isChecked){
        await page.click(sels.checkbox)
    }
    return isChecked
}

async function enrollStudent(page,ou,name){
    await page.goto(`https://${SUBDOMAIN}.brightspace.com/d2l/lms/group/group_list.d2l?ou=${ou}`)
    await selectVirtualGathering(page)
    await page.click(sels.menuDropdown)
    await Promise.all([
        page.waitForNavigation(),
        page.click(sels.enrollUsers)
    ])
    // TODO: see what happens when multiple groups are present
    let isChecked = await selectStudent(page,name)
    await Promise.all([
        page.waitForNavigation(),
        page.click(sels.save)
    ])
    return isChecked
}

async function main(auth,data){
    const browser = await puppeteer.launch({headless:false})
    const page = await browser.newPage()
    var percent;
    await page.setViewport({
        width:1800,
        height:900
    });
    await login(page,auth)
    for(var i = 0; i < data.length; i++){
        try{
            let isChecked = await enrollStudent(page,data[i].ou,data[i].name)
            report.push({
                result: isChecked?"already checked":"success",
                student: data[i].name,
                course: data[i].courseName,
                ou: data[i].ou
            })
        } catch (e){
            report.push({
                result:e,
                student:data[i].name,
                course: data[i].courseName,
                ou: data[i].ou
            })
        }
        
        //make a pretty number
        if(i === 0){
            percent = 0;
        } else {
            percent = (i / data.length  * 100).toFixed(2);
        }
        
        console.log(`${percent}% | OU:${data[i].ou} |${data[i].name} `)
    }
    await browser.close()
    
    fs.writeFileSync(`report-${Date.now()}.csv`,d3.csvFormat(report))
    console.log("file written")
}


prompt.get([{
    name:"subdomain",
    type:"string",
    default: "pathway",
    description: "subdomain",
    message: "was not pathway or byui",
    conform: d => ['pathway','byui'].includes(d)
},{
    name: 'username',
    description: 'cct username',
    type: 'string',
},{
    name: 'password',
    description: 'cct password',
    type: 'string',
    hidden: true,
    message: 'please enter username and password',
    conform: password => {
        var username = prompt.history('username').value;
        return (username && password) || fs.existsSync('auth.json')
    }
},{
    name: 'courses',
    description: 'csv containing courses ous',
    message: 'Make sure path to csv is correct and has the headers code,id',
    required: true,
    conform: file => {
        file = path.resolve(__dirname,file) 
        console.log('File tried:', file);
        if(fs.existsSync(file)){
            coursesTop = d3.csvParse(fs.readFileSync(file,'utf8'));
            let headers = coursesTop.columns;
            
            return ['code','id'].every(h => headers.includes(h))
        } else {
            return false
        }
    },
},{
    name: 'signups',
    description: 'csv containing students tht need to be enrolled',
    message: 'Make sure path to csv is correct and has the headers FIRST_NAME,LAST_NAME REFERENCE',
    required: true,
    conform: file => {
        file = path.resolve(__dirname,file) 
        console.log('File tried:', file);
        if(fs.existsSync(file)){
            signUps = d3.tsvParse(fs.readFileSync(file,'utf16le'));
            let headers = signUps.columns;
            return ['FIRST_NAME','LAST_NAME','REFERENCE'].every(h => headers.includes(h))
        } else {
            return false
        }
    },
}], (err, r) => {
    if(err) return console.error(err)
    SUBDOMAIN = r.subdomain
    let signups = signUps;
    let courses = coursesTop;
    let auth = r.username && r.password ? r : require('./auth.json')
    let courseMap = courses.reduce((obj,course) => {
        obj[course.code] = course.id; 
        return obj
    },{})
    let data = signups.map(s => ({
        name: s.FIRST_NAME + " " + s.LAST_NAME,
        ou: courseMap[s.REFERENCE],
        courseName: s.REFERENCE
    }))
    main(auth,data)
})