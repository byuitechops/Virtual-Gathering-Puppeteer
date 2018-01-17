const puppeteer = require('puppeteer');
const auth = require('./auth.json')

const subdomain = 'byui'
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

async function login(page){
    await page.goto(`https://${subdomain}.brightspace.com/d2l/login?noredirect=true`)
    await page.type(sels.loginUsername,auth.username),
    await page.type(sels.loginPassword,auth.password)
    await page.click(sels.loginButton)
    await page.waitForSelector(sels.courseSearchButton)
}

async function goToCourse(page,courseName){
    await page.click(sels.courseSearchButton)
    await Promise.all([
        page.waitForSelector(sels.results),
        page.type(sels.courseSeacrch,courseName+'\n')
    ])
    
    let numResults = await page.$eval(sels.results, ul => ul.children.length )
    
    if(numResults != 1){
        throw new Error('Couldn\'t find the course')
    }
    
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
    await Promise.all([
        page.type(sels.searchStudent,name+'\n'),
        page.waitForSelector(sels.numResults),
    ])
    let numResults = await page.$eval(sels.numResults, e => e.innerHTML)
    if(numResults != 1){
        throw new Error(`Couldn't find ${name}`)
    }
    
    let isChecked = await page.$eval(sels.checkbox, checkbox => checkbox.checked)
    
    if(!isChecked){
        await page.click(sels.checkbox)
    }
}

async function main(){
    const browser = await puppeteer.launch({headless:false})
    const page = await browser.newPage()
    await login(page)
    await selectVirtualGathering(page)
    await page.click(sels.menuDropdown)
    await Promise.all([
        page.waitForNavigation(),
        page.click(sels.enrollUsers)
    ])
    await selectStudent(page,"Scott")
    await Promise.all([
        page.waitForNavigation(),
        page.click(sels.save)
    ])
//    await browser.close()
}

main()