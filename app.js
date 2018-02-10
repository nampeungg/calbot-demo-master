var restify = require('restify');
var builder = require('botbuilder');




//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

//Set Up Database.

var Connection = require('tedious').Connection;  
var config = {  
    userName: 'nampeungg',  
    password: 'Peung239.',  
    server: 'np-server.database.windows.net',  
    options: {encrypt: true, database: 'NP-DB'}  
};  

var connection = new Connection(config);  
connection.on('connect', function(err) {  
});
var Request = require('tedious').Request;  
var TYPES = require('tedious').TYPES;  

// Bot Storage: Here we register the state storage for your bot. 
// Default store: volatile in-memory store - Only for prototyping!
// We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
// For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
var inMemoryStorage = new builder.MemoryBotStorage();

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage); // Register in memory storage;
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Middleware
//=========================================================

// Anytime the major version is incremented any existing conversations will be restarted.
bot.set(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^reset/i }));

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

bot.dialog('/', [
    function (session) {
        // Send a greeting and show help.
        var card = new builder.HeroCard(session)
            .title("NP Shop")
            .text("All the clothes you need")
            .images([
                 builder.CardImage.create(session, "https://image.ibb.co/kL4Ce6/online_store.png")
            ]);
        var msg = new builder.Message(session).attachments([card]);
        session.send(msg);
        session.send("Hi... Welcome to NP Shop.");

        session.beginDialog('/help');
    },
    function (session, results) {
        // Display menu
        session.beginDialog('/menu');
    },
    function (session, results) {
        // Always say goodbye
        session.send("Ok... See you later!");
    }
]);

bot.dialog('/menu', [
    function (session) {
        builder.Prompts.choice(session, "What do you want to ask?", "Detail of Products|Recommendation|FAQ|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/Detail of Products', [
    function (session) {
        session.send("What do you want to know about our products? Please tell me.")
        builder.Prompts.choice(session, "Please Choose : ", "Price|Stock|Size|Color|none");
    },
    function (session, results) {
        session.send("You want to know about the "+results.response.entity+"...")
        if (results.response.entity == "Price") {
            session.beginDialog('askPrice');
        }
        else if (results.response.entity == "Stock") {
            session.beginDialog('askStock');
        }
        else if (results.response.entity == "Size")
        {
            session.beginDialog('askSize');
        }
    }
]);

bot.dialog('askPrice', [
    function (session) {
        builder.Prompts.text(session,"Enter Product Name: ");
    },
    function (session,results){
        
        executeAskPrice(session,"SELECT DISTINCT Name, Picture, Price FROM Products WHERE Name LIKE '%"+(results.response).toLowerCase()+"%'");
    }
]);


function executeAskPrice(session,sql_query) {  
    request = new Request(sql_query, function(err) {  
    if (err) {  
        session.send(err);}  
    });  
    var result = "";  
    request.on('row', function(columns) {  
        /*columns.forEach(function(column) {  
          if (column.value === null) {  
            session.send('NULL');  
          } else {  
            result+= column.value + " ";  
          }  
        });*/  
        name = columns[0].value;
        pic = columns[1].value;
        price = columns[2].value;
        var sendpic = new builder.Message(session)
        .attachments([{
            contentType: "image/jpeg",
            contentUrl: pic
        }]);
        session.send(sendpic);
        session.send("Name: %s\n\nPrice: %d Baht" , name, price);  
        //result ="";  
    });  

    request.on('doneInProc', function(rowCount, more) {  
    session.send(rowCount + ' products returned');  
    });  
    connection.execSql(request);  
}

bot.dialog('askStock', [
    function (session) {
        builder.Prompts.text(session,"Enter Product's Name: ");
    },
    function (session, results) {
        name = results.response
        builder.Prompts.text(session, "Enter Product's Size: ");
    },
    function (session, results) {
        size = results.response
        builder.Prompts.text(session, "Enter Product's Color: ");
    },
    function (session, results) {
        color = results.response
        executeAskStock(session,"SELECT ID, Picture, Quantity FROM Products WHERE Name LIKE '%"+name.toLowerCase()+"%' and Size = '"+size.toLowerCase()+"' and Color LIKE '%"+color.toLowerCase()+"%'");
    }
]);

function executeAskStock(session,sql_query) {  
    request = new Request(sql_query, function(err) {  
    if (err) {  
        session.send(err);}  
    });  
    var result = "";  
    request.on('row', function(columns) {  
        id = columns[0].value;
        pic = columns[1].value;
        stock = columns[2].value;
        var sendpic = new builder.Message(session)
        .attachments([{
            contentType: "image/jpeg",
            contentUrl: pic
        }]);
        session.send(sendpic);
        session.send("ID: %s\n\nStock: %d" , id, stock);  
    });  

    request.on('doneInProc', function(rowCount, more) {  
    session.send(rowCount + ' products returned');  
    });  
    connection.execSql(request);  
}

bot.dialog('askSize', [
    function (session) {
        builder.Prompts.text(session,"Enter Product's Name: ");
    },
    function (session, results) {
        var size = ""
        var lists = []
        name = results.response
        executeAsk("SELECT Name, Picture, Size FROM Products WHERE Name LIKE '%"+name.toLowerCase()+"%' Order By ID;",function(err,results,rows) {

            for (var i = 0; i < (rows-1); i++){
                if (results[i].Name == (results[i+1]).Name) {
                    (results[i+1])['Size'] = (String(results[i].Size)).toUpperCase()+" "+(String(results[i+1].Size)).toUpperCase();
                    lists.push(i);
                }
            }
            for (var i = lists.length -1; i >= 0; i--){
                results.splice(lists[i],1);
            }

            results.forEach(function(result){
                var sendpic = new builder.Message(session)
                .attachments([{
                    contentType: "image/jpeg",
                    contentUrl: result.Picture
                }]);
                session.send(sendpic);
                session.send("Product's Name: "+(result.Name).capitalize()+ "\n\nSize: "+result.Size);
            })
        }); 
    },
]);
 

function executeAsk(qryString, callback) {

    var request = new Request(qryString, function(err, rowCount) {
        if (err) {
            console.log('Error in request: ' + err);
        } else {
            console.log('Rows returned: ' + rowCount);
        }
        callback(err, resultSet,rowCount);
    });

    var resultSet = [];

    request.on('row', function(columns) {
        var row = {}; 
        columns.forEach(function(column) {
            if (column.isNull) {
                row[column.metadata.colName] = null;
            } else {
                row[column.metadata.colName] = column.value;
            } 
        });
        //console.log('Row is: ' + row);
        resultSet.push(row);
    });

    connection.execSql(request);
    //console.log('resultSet: ' + resultSet);
    return resultSet;
}


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

