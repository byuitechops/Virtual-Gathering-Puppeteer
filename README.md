# Virtual-Gathering-Puppeteer
Enrolls students into the virtual gathering groups in D2L by way of puppeteer

## Needs a CSV file, a Txt file and a D2L Backdoor account
### Courses CSV
from the [Course-List-Tool3.0](https://byui.brightspace.com/d2l/le/content/286190/viewContent/5523129/View)

| code | id |
|------|----|
| Campus.2016.Winter.FDREL327 | 55337 |

### Signup **Txt**

| FIRST_NAME | LAST_NAME | REFERENCE |
|------------|-----------|-----------|
| Bob | Jones | Campus.2016.Winter.FDREL327 |

We noticed that many students have interesting chars in their name requiring the csv to be in unicode. 

#### Convert Excel to Txt

1. First remove the FDREL enrollments off the list.
2. Convert the Excel file to txt

The data for `signups` come in an MS Excel file and needs a `Save as`, selecting `Unicode text` as the `Save as type` in the dialog box.

### And a D2L backdoor account

You need an account that has the group enrollment permission for the courses needed.

