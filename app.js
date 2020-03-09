const request = require('request');
const cheerio = require('cheerio');
const ical =    require('ical-generator');
const moment =  require('moment');
const http =    require('http');
const yargs =   require('yargs');

const cal = ical({domain: 'fastmail.com', name: 'Waste Collection iCal'});
const port = 3000;
const server = '127.0.0.1';

// Arguments - uprn - Unique property number
// Address - text string - not as useful - might look to remove.
const wasteUrlPrefix =      'https://myneighbourhood.merton.gov.uk/Wasteservices/WasteServices.aspx?'
const wasteUrluprnArg =     'uprn=';
const wasteUrladdressArg =  'Address=';

// Command line parsing
const argv = yargs
    .command('add', 'Get the waste services for an Address of a property in Merton - use quotes to hold the spaces', {
        address: {
            description: 'the address in Merton to check for - has to match the Merton lookup',
            alias: 'a',
            type: 'string',
        },
        property: {
            description: 'The unique property reference number - preferred',
            alias: 'p',
            type: 'string',
        }
    })
    .option('server', {
        alias: 's',
        description: 'Run the iCal service as a server on: ' + server + ':' + port,
        type: 'boolean',
    })
    .help()
    .alias('help', 'h')
    .argv;

// Different services supplied by merton 
const wasteTypes = [
    'food-caddy',
    'papercard-wheelie',
    'plastics-boxes',
    'rubbish-wheelie',
    'garden',
    'textiles',
    'batteries'
];

// Output result - the days each service will be available on - this will be the next instance from the 
// day on which this script is executed.
// TODO - Check this
var wasteServiceDays = [];

// Generate the iCal event per service 
// TODO - consider combining multiple events on a day
const genEvents = function( wasteServiceDays ) { 
    // Generate iCal events?
    for (const service of wasteTypes) {
        element = wasteServiceDays[service]
        console.log("Looking for service: " + element.name );
        if( element.date == null || element.date.length == 0 ) {
            console.log( element.name + ' service is not available');
        }
        else {
            console.log("Generating iCal event: " + element.name );
            cal.createEvent({
                start: moment( element.date, "DD MMMM YYYY" ), // Parse the date
                allDay: true, // We could do the whole - it must be done at 6am - but really?
                summary: element.name,
                location: '@home',
            });
            console.log( element ); // Dump a copy of the event
        }     
    }
}

// Show help manually because we have no idea what to do
function showHelpQuit() {
    console.log( "No commands or options to use" );
    yargs.showHelp('log');
}

// Actual Execution
// __main__

// An address was requested
if( argv._.includes('add') ) {
    var wasteUrl = wasteUrlPrefix;

    if( argv.property ) { 
        console.log("Getting next service dates for property: " + argv.property );
        // just use this
        // Construct the URL
        var wasteUrl = wasteUrlPrefix + wasteUrluprnArg + argv.property;
    }
    if( !( argv.property || argv.address ) ) {
        showHelpQuit();
        return;
    }
    
    console.log( wasteUrl );
    request(wasteUrl, function(err, resp, html) {
        if ( !err ) {
            const $ = cheerio.load(html);
            var i = 0;
            for( i = 0; i < wasteTypes.length; i++ ) {
                var baseSearchTerm = 'tr.' + wasteTypes[i];
                wasteServiceDays[wasteTypes[i]] = { 
                    name: $( baseSearchTerm + '> td:first-child').text(), 
                    date: $( baseSearchTerm + '> td:nth-child(2) > p:nth-child(2) > b' ).text() };

            }

            // Have all the waste service days
            console.log( "Generating iCal events" );
            console.log( "Services: " + wasteServiceDays.length );

            genEvents( wasteServiceDays );
            // console.log( cal.toString() );

            if( argv.server ) {
                http.createServer(function(req, res) {
                    cal.serve(res);
                }).listen(port, server, function() {
                    console.log('Server running at http://' + server + ':' + port + '/' );
                });
            }
        }
        else {
            console.log( "Request failed - check the address is valid in Merton" );
            console.log( "Error: " + err );
            console.log( "Response: " + resp );
        }
    });
}
else {
    showHelpQuit()
}




