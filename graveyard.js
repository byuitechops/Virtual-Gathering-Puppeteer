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