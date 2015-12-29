/*jslint browser: true */

/*globals tangelo, flickr, $, google, d3, date, console */

// this global variable is set when the user changes the category/subcategory pair being examined
var current_category;

// allow the user to change the month to display
var current_month;
var month_names = [
"November 2011"
];

// allow the user to change the month to display
var current_day;
var day_names = [1,2,3,4,5];
var dayNames = ['Mon','Tues','Wed','Thur','Fri','Sat','Sun']

var current_hour;
var hour_names = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM",
        "2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];

// this is a list of the current categories and subcategories from the XDATA challenge
// dataset (CIDR browsing activity).

var category_names = [
"Automotive,AU - Manufacturing",
"Business Services,BS - Computer Services",
"Software as a Service,SaaS - High Technology",
"Software as a Service,SaaS - Media & Entertainment1"
];



var flickr = {};
flickr.map = null;
flickr.timeslider = null;


flickr.getMongoDBInfo = function () {
    "use strict";

    // Read in the config options regarding which MongoDB
    // server/database/collection to use.
    return {
        server:  'localhost',
        db: 'FeederWatch',
        coll: 'interactions'
  };
};

function updateConfig() {
    "use strict";

    var server,
        db,
        coll;

    // Grab the elements.
    server = document.getElementById("mongodb-server");
    db = document.getElementById("mongodb-db");
    coll = document.getElementById("mongodb-coll");

    // Write the options into DOM storage.
    localStorage.setItem('akamai-cidr-geomap:mongodb-server', server.value);
    localStorage.setItem('akamai-cidr-geomap:mongodb-db', db.value);
    localStorage.setItem('akamai-cidr-geomap:mongodb-coll', coll.value);
}

function setConfigDefaults() {
    "use strict";

    var cfg;

    // Clear out the locally stored options.
    localStorage.removeItem('akamai-cidr-geomap:mongodb-server');
    localStorage.removeItem('akamai-cidr-geomap:mongodb-db');
    localStorage.removeItem('akamai-cidr-geomap:mongodb-coll');

    // Retrieve the new config values, and set them into the fields.
    cfg = flickr.getMongoDBInfo();
    d3.select("#mongodb-server").property("value", cfg.server);
    d3.select("#mongodb-db").property("value", cfg.db);
    d3.select("#mongodb-coll").property("value", cfg.coll);
}

function getMinMaxDates(zoom) {
    "use strict";

    var mongo,
        july30;

    mongo = flickr.getMongoDBInfo();

    // Query the collection about the earliest and latest dates in the
    // collection.
    $.ajax({
        type: 'POST',
        url: '/service/mongo/' + mongo.server + '/' + mongo.db + '/' + mongo.coll,
        data: {
            sort: JSON.stringify([['unixtime', -1]]),
            limit: 1,
            fields: JSON.stringify(['unixtime'])
        },
        dataType: 'json',
        success: function (response) {
            var val;

            if (response.error !== null || response.result.data.length === 0) {
                // Error condition.
                console.log("error: could not get maximum time value from database - " + response.error ? response.error : "no results returned from server");
            } else {
                val = +response.result.data[0].unixtime;
                flickr.timeslider.slider("option", "max", val);
                flickr.timeslider.slider("values", 1, val);
                $.ajax({
                    type: 'POST',
                    url: '/service/mongo/' + mongo.server + '/' + mongo.db + '/' + mongo.coll,
                    data: {
                        sort: JSON.stringify([['unixtime', 1]]),
                        limit: 1,
                        fields: JSON.stringify(['unixtime'])
                    },
                    dataType: 'json',
                    success: function (response) {
                        var val;

                        if (response.error !== null || response.result.data.length === 0) {
                            // Error condition.
                            console.log("error: could not get minimum time value from database - " + response.error ? response.error : "no results returned from server");
                        } else {
                            //val = +response.result.data[0]['date']['$date'];
                            val = +response.result.data[0].unixtime;
                            flickr.timeslider.slider("option", "min", val);


                            // Go ahead and zoom the slider to this range, if
                            // requested.
                            if(zoom){
                                zoom(flickr.timeslider);
                            }

                            // Finally, retrieve the initial data to bootstrap
                            // the application.
                            retrieveData();

                            // Add the 'retrieveData' behavior to the slider's
                            // onchange callback (which starts out ONLY doing
                            // the 'displayFunc' part).
                            flickr.timeslider.slider("option", "change", function(evt, ui) {
                                var low,
                                    high;

                                low = ui.values[0];
                                high = ui.values[1];

                                //flickr.displayFunc(low, high);
                                console.log("returned dates: (",low, ", ",max,")");
                                retrieveData();
                            });
                        }
                    }
                });
            }
        }
    });
}

function retrieveDataSynthetic() {
    "use strict";

    var chicago,
        paris,
        slc,
        albany,
        dhaka,
        rio,
        wellington,
        locs;

    // Generate a few lat/long values in well-known places.
    chicago = [42.0, -87.5];
    paris = [48.9, 2.3];
    slc = [40.8, -111.9];
    albany = [42.7, -73.8];
    dhaka = [23.7, 90.4];
    rio = [-22.9, -43.2];
    wellington = [-41.3, 174.8];

    // Take the array of arrays, and map it to an array of google LatLng
    // objects.
    locs = [chicago, paris, slc, albany, dhaka, rio, wellington].map(function (d) { return new google.maps.LatLng(d[0], d[1]); });

    // Store the retrieved values.
    flickr.map.locations(locs);

    // After data is reloaded to the map-overlay object, redraw the map.
    flickr.map.draw();
}

function retrieveData() {
    "use strict";

    var times,
        timequery,
        hashtagText,
        hashtags,
        mongoquery,
        query,
        mongo;

    console.log('retrieve data');

    // Interrogate the UI elements to build up a query object for the database.
    //
    // Get the time slider range.
    //times = flickr.timeslider.slider("values");
    //console.log("slider times: ",times);

   // Construct a query to find any entry within an hour of the start time
   var starttime,interval_in_hours,stoptime;
   starttime = Number(d3.select("#start-time").node().value)
   //interval_in_hours = Number(d3.select("#time-interval").node().value)
   interval_in_hours = 1
   stoptime = starttime + interval_in_hours*3600
   console.log("plotting interval:(",starttime,stoptime,")")
   if (current_category == "None") {
         mongoquery = { };
   } else {
        // the user has selected a category and subcategory, lets split out the values and refine the query
      var split = current_category.split(",");
      var category = split[0]
      var subcategory = split[1]
      console.log("cat=",category,"sub=",subcategory)
    mongoquery = { };
    }

    // Enable the abort button and issue the query to the mongo module.
    mongo = flickr.getMongoDBInfo();
    d3.select("#abort")
        .classed("btn-success", false)
        .classed("btn-danger", true)
        .classed("disabled", false)
        .html("Abort query <i class=\"icon-repeat icon-white spinning\"></i>");

    flickr.currentAjax = $.ajax({
        type: 'POST',
        url: '/service/mongo/' + mongo.server + '/' + mongo.db + '/' + mongo.coll,
        data: {
            query: JSON.stringify(mongoquery),
            //limit: d3.select("#record-limit").node().value,
            sort: JSON.stringify([['date', 1]])
            //sort: JSON.stringify([[]])
        },
        dataType: 'json',
        success: function (response) {
            var N,
                data;

            console.log('response:',response)
            // Remove the stored XHR object.
            flickr.currentAjax = null;

            // Indicate success, display the number of records, and disable the
            // button.
            N = response.result.data.length;
            /*
            d3.select("#abort")
                .classed("btn-danger", false)
                .classed("btn-success", true)
                .classed("disabled", true)
                .text("Got " + N + " result" + (N === 0 || N > 1 ? "s" : ""));
*/
            // Process the data to separate out all the location objects
            var i,j;
            var thisObs;
            var locs;
            var occurrences = [];
            var thisOccurrence;
            for (i=0;i<N;i++) {
                thisObs = response.result.data[i]
                console.log("found: ",thisObs['location_name']," date: ",thisObs['date']);
                if (thisObs.location) {

                   // reformat the data so there is an array entry for each browsing occurrence point
                   // with the appropriate metadata loaded into the overlay.  This is
                   // so d3 select operations can operate on the array for rendering individual
                   // circles for each occurrence point.

                   // perturb the location data so observations of different birds from the same feeder are not 
                   // on top of each other when the map is zoomed way in

                   thisObs.location[0] = thisObs.location[0] + randomLocationOffset()
                   thisObs.location[1] = thisObs.location[1] + randomLocationOffset()

                        thisOccurrence = {
                                name: thisObs.location_name,
                                date: thisObs.date,
                                subject: thisObs.subject,
                                interaction: thisObs.interaction,
                                target: thisObs.target,
                                observation: thisObs.observation,
                                location: thisObs.location,
                                _id: thisObs._id
                                };
                        occurrences.push(thisOccurrence);
                };
            };

            //

            // Store the retrieved values in the map object.
            flickr.map.locations(occurrences);

            // Redraw the map.
            flickr.map.draw();
        }
    });
}

function GMap(elem, options) {
    "use strict";

    var that;

    // Create the map object and place it into the specified container element.
    this.map = new google.maps.Map(elem, options);

    // Record the container element.
    this.container = elem;

    // Create an empty data array.
    this.locationData = [];

    // Store a null 'overlay' property, which will be filled in with a
    // transparent SVG element when the overlay is sized and placed in the
    // draw() callback.
    this.overlay = null;

    this.dayColor = d3.scale.category10();
    this.monthColor = d3.scale.category20();

    this.setMap(this.map);

    that = this;
    google.maps.event.addListener(this.map, "drag", function () { that.draw(); });
}

// these routines are invoked when the user changes the selection value on the web page which is loaded
// with all the browsing categories, days, hours, etc.. The global variables "current_category", "current_month", etc.
// are  updated with the selected value to affect the query from mongo immediately after the change is made by the user.

cidr_select_category = function (state) {
      current_category = d3.select("#category").property('value');
      console.log("category is: ",current_category);
      retrieveData();
};

cidr_select_month = function (state) {
      current_month = d3.select("#selected-month").property('selectedIndex')+10;
      //current_month = 11;
      console.log("month is: ",current_month);
      var newunixtime = getUnixTimeFromComponents(current_month,current_day,2011,current_hour);
      console.log("unixtime=",newunixtime, " or ",getIntegerFromUnixTime(newunixtime));
      retrieveData();
};
cidr_select_day = function (state) {
      current_day = d3.select("#selected-day").property('value');
      console.log("day is: ",current_day);
        var newunixtime = getUnixTimeFromComponents(current_month,current_day,2011,current_hour);
      console.log("unixtime=",newunixtime, " or ",getIntegerFromUnixTime(newunixtime));
      d3.select("#start-time").attr('value',(getIntegerFromUnixTime(newunixtime)));
      retrieveData();
};

cidr_select_hour = function (state) {
      current_hour = d3.select("#selected-hour").property('selectedIndex');
      console.log("hour is: ",current_hour);
      var newunixtime = getUnixTimeFromComponents(current_month,current_day,2011,current_hour);
      console.log("unixtime=",newunixtime, " or ",getIntegerFromUnixTime(newunixtime));
      d3.select("#start-time").attr('value',(getIntegerFromUnixTime(newunixtime)));
      retrieveData();
};

getUnixTimeFromComponents = function(month,day,year,hour) {
  d = new Date();
  d.setUTCFullYear(year);
  d.setUTCMonth(month-1);
  d.setUTCDate(day);
  d.setUTCHours(hour,0,0);
  return d;
};

getIntegerFromUnixTime = function(unixtime) {
  d = new Date();
  d.setTime(unixtime);
  return Math.floor(d.valueOf()/1000);
};

// the user has hand entered a particular unixtime to start a query.  We need to update the appropriate
// month, day, and hour selectors, then perform the query

changedUnixStartTime = function () {
    console.log("unixtime changed");
    retrieveData();

};

// perturb locations a pixel or two so observations don't always sit on top of each other, this routine is used to perturb locations.

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function randomLocationOffset()
{
    return randomIntFromInterval(-100,100)/5000000.0
}


// this function is invoked upon page load or reload automatically.  It sets up the UI elements, initiallizes the
// map and does an initial query to add some default entries to the map.

window.onload = function () {
    "use strict";

    var options,
        div,
        buttons,
        i,
        displayFunc,
        checkbox,
        dayboxes,
        popover_cfg,
        zoomfunc,
        redraw,
        drawer_toggle;

    flickr.timeslider = $("#time-slider");

    // load up a select element on the web page with the categories.  A callback is registered to invoke
    // the cidr_select_category function when the user selects a particular category.  When the "retrieveData()"
    // method is invoked, a query of renderable data is pulled from mongoDB and rendered using d3 overlayed over a
    // Google map background.

    var categories_copy;
    categories_copy = category_names.slice();
    categories_copy.shift();
    categories_copy.unshift("None");
    current_category = "None";

    var months_copy;
    months_copy = month_names.slice();
    //months_copy.shift();
    //months_copy.unshift("None");
    current_month = 11;

    var days_copy;
    days_copy = day_names.slice();
    //categories_copy.shift();
    //categories_copy.unshift("None");
    current_day = 1;

    var hours_copy;
    hours_copy = hour_names.slice();
    //categories_copy.shift();
    //categories_copy.unshift("None");
    current_hour = 0;

    d3.select("#category").selectAll("option")
        .data(categories_copy)
        .enter().append("option")
        .text(function (d) { return d; });
        d3.select("#category").on("change", function () {
        cidr_select_category(this.value);
        });

    d3.select("#selected-month").selectAll("option")
        .data(months_copy)
        .enter().append("option")
        .text(function (d) { return d; });
        d3.select("#selected-month").on("change", function () {
          //cidr_select_month(this.value);
        });
    d3.select("#selected-day").selectAll("option")
        .data(days_copy)
        .enter().append("option")
        .text(function (d) { return d; });
        d3.select("#selected-day").on("change", function () {
          cidr_select_day(this.selectedIndex);
        });

    d3.select("#selected-hour").selectAll("option")
        .data(hours_copy)
        .enter().append("option")
        .text(function (d) { return d; });
        d3.select("#selected-hour").on("change", function () {
        cidr_select_hour(this.selectedIndex);
        });

    // Enable the popover help items.
    //
    // First create a config object with the common options preset.
    popover_cfg = {
        html: true,
        container: "body",
        placement: "top",
        trigger: "hover",
        title: null,
        content: null,
        delay: {
            show: 50,
            hide: 50
        }
    };

    // Time slider help.
    popover_cfg.title = "Start time in unixtime";
    popover_cfg.content = "This entry lets unixtime hackers enter an exact time in seconds for the beginning of an hour of browsing."+
        "As a hint, the dataset begins with time: 1320105600. <br><br>" +
        "Alternatively, a user can select a time from the date/time sliders below ";
    $("#time-filter-help").popover(popover_cfg);

    // record limit help. Enabling this messed up the layout of the buttons, so disabled it for now.
    popover_cfg.title = "Record Count Limit";
    popover_cfg.content = "There are generally approximately 35600 entries per hour total. This limits lets the user browse just a portion of the records for speed. ";
    $("#recordlimit-filter-help").popover(popover_cfg);


    // Equip ourselves with the overlay prototype.
    GMap.prototype = new google.maps.OverlayView();

    // Implement the callbacks for controlling the overlay.
    //
    // onAdd() signals that the map's panes are ready to receive the overlaid
    // DOM element.
    GMap.prototype.onAdd = function () {
        console.log("onAdd()!");

        // Grab the overlay mouse target element (because it can accept, e.g.,
        // mouse hover events to show SVG tooltips), wrap it in a D3 selection,
        // and add the SVG element to it.
        this.overlayLayer = this.getPanes().overlayMouseTarget;

        var svg = d3.select(this.overlayLayer).append("div")
            .attr("id", "svgcontainer")
            .style("position", "relative")
            .style("left", "0px")
            .style("top", "0px")
            .append("svg");

        // Add a debugging rectangle.
        //svg.append("rect")
            //.attr("id", "debugrect")
            //.style("fill-opacity", 0.4)
            //.style("fill", "white")
            //.style("stroke", "black")
            //.attr("width", svg.attr("width"))
            //.attr("height", svg.attr("height"));

        svg.append("g")
            .attr("id", "markers");

        // Record the SVG element in the object for later use.
        this.overlay = svg.node();

        // Add an SVG element to the map's div to serve as a color legend.
        svg = d3.select(this.map.getDiv())
            .append("svg")
            .style("position", "fixed")
            .style("top", "100px")
            .style("right", "0px")
            .attr("width", 100)
            .attr("height", 570);

        // Add an SVG group whose contents will change or disappear based on the
        // active colormap.
        this.legend = svg.append("g");
    };

    // draw() sizes and places the overlaid SVG element.
    GMap.prototype.draw = function () {
        var proj,
            w,
            h,
            containerLatLng,
            divPixels,
            div,
            newLeft,
            newTop,
            svg,
            data,
            days,
            N,
            that,
            color,
            radius,
            opacity,
            markers;

        // Get the transformation from lat/long to pixel coordinates - the
        // lat/long data will be "pushed through" it just prior to being drawn.
        // It is deferred this way to deal with changes in the window size,
        // etc., that can occur without warning.
        proj = this.getProjection();

        // If proj is undefined, the map has not yet been initialized, so return
        // right away.
        if (proj === undefined) {
            return;
        }

        // Shift the container div to cover the "whole world".
        //
        // First, compute the pixel coordinates of the bounds of the "whole
        // world".
        proj = this.getProjection();
        w = this.container.offsetWidth;
        h = this.container.offsetHeight;
        containerLatLng = proj.fromContainerPixelToLatLng({x: 0, y: 0});
        divPixels = proj.fromLatLngToDivPixel(containerLatLng);

        // Move and resize the div element.
        div = d3.select(this.overlayLayer).select("#svgcontainer");
        newLeft = divPixels.x + "px";
        newTop = divPixels.y + "px";
        div.style("left", newLeft)
            .style("top", newTop)
            .style("width", w + "px")
            .style("height", h + "px");

        // Resize the SVG element to fit the viewport.
        svg = d3.select(this.overlayLayer).select("svg");
        svg.attr("width", w)
            .attr("height", h);

        //// Make the rect element track the SVG element.
        //svg.select("#debugrect")
            //.attr("width", svg.attr("width"))
            //.attr("height", svg.attr("height"));

        // Process the data by adjoining pixel locations to each entry.
        data = this.locationData.map(function (d) {
            d.pixelLocation = proj.fromLatLngToDivPixel(new google.maps.LatLng(d.location[1], d.location[0]));
            // The last term is to perturb locations so they aren't on top of each other. 
            var scale = map.getZoom*2.0;
            d.pixelLocation.x -= divPixels.x;
            d.pixelLocation.y -= divPixels.y;
            return d;
        });


        // Grab the total number of data items.
        N = data.length;
        //console.log("found ",N, " data items");

        // Select a colormapping function based on the radio buttons.
        that = this;
        color = (function () {
            var which,
                bbox,
                colormap,
                elemtext,
                heightfunc,
                legend,
                li,
                maxheight,
                maxwidth,
                retval,
                invert,
                range,
                scale,
                text;

            // Capture the color legend SVG group element.
            legend = that.legend;

            // Determine which radio button is currently selected.
            which = $("input[name=colormap]:radio:checked").attr("id");

            // Generate a colormap function to return, and place a color legend
            // based on it.
            if (which === 'tiplength') {
               legend.selectAll("*").remove();
               range =  ['blue', 'red'];
                scale = d3.scale.linear()
                    .domain([0, 35])
                    .range(range);

                retval = function (d) {
                    //console.log(d.branch_length);
                    return scale(d.hits);
                };


            } else if (which === 'day') {
                colormap = function (d) {
                    return that.dayColor(d.day);
                };

                tangelo.util.svgColorLegend({
                    legend: legend.node(),
                    cmap_func: that.dayColor,
                    xoffset: 10,
                    yoffset: 10,
                    categories: tangelo.date.dayNames(),
                    height_padding: 5,
                    width_padding: 7,
                    text_spacing: 19,
                    legend_margins: {top: 5, left: 5, bottom: 5, right: 5},
                    clear: true
                });

                retval = colormap;
            } else if (which === 'rb') {
                legend.selectAll("*").remove();

                invert = document.getElementById("invert").checked;
                range = invert ? ['red', 'blue'] : ['blue', 'red'];
                scale = d3.scale.linear()
                    .domain([0, N - 1])
                    .range(range);

                retval = function (d, i) {
                    return scale(i);
                };
            } else {
                legend.selectAll("*").remove();
                retval = "pink";
            }

            return retval;
        }());

        // Select a radius function as well.
        radius = (function () {
            var which,
                retval,
                size;

            // Determine which radio button is selected.
            which = $("input[name=size]:radio:checked").attr("id");

            // Generate a radius function to return.
            if (which === 'hits') {
                retval = function (d, i) {
                    //return 5 + 15 * (N - 1 - i) / (N - 1);
                    if (d.hits > 0)
                      return 5 + Math.log(d.hits);
                     else
                       return 0;
                };
            } else if (which === 'bytes') {
                retval = function (d, i) {
                    if (d.bytes > 0)
                      return 5 + Math.log(d.bytes);
                     else
                       return 0;
                };
            } else {
                // Get the size value.
                size = parseFloat(d3.select("#size").node().value);
                if (isNaN(size) || size <= 0.0) {
                    size = 5.0;
                }

                retval = size;
            }

            return retval;
        }());


        // Compute a data join with the current list of marker locations, using
        // the MongoDB unique id value as the key function.
        //
        /*jslint nomen: true */
        markers = d3.select(this.overlay)
            .select("#markers")
            .selectAll("circle")
            .data(data, function (d) {
                return d._id.$oid;
            });
        /*jslint nomen: false */

        // For the enter selection, create new circle elements, and attach a
        // title element to each one.  In the update selection (which includes
        // the newly added circles), set the proper location and fade in new
        // elements.  Fade out circles in the exit selection.
        //
        // TODO(choudhury): the radius of the marker should depend on the zoom
        // level - smaller circles at lower zoom levels.
        markers.enter()
            .append("circle")
            .style("opacity", 0.0)
            .attr("r", 0)
            .append("title")
            .text(function (d) {
                var date,
                    msg;

                date = d.date;

                msg = "";
                msg += "subject: " + d.subject + "\n";
                msg += "interaction:" + d.interaction+ "\n";
                msg += "target:" + d.target+ "\n";
                msg += "date:" + d.date + "\n";
                msg += "location: (" + d.location[1] + ", " + d.location[0] + ")\n";
                msg += "observation ID: " + d.observation;

                return msg;
            });

        // This is to prevent division by zero if there is only one data
        // element.
        if (N === 1) {
            N = 2;
        }
        markers
            .attr("cx", function (d) {
                return d.pixelLocation.x;
            })
            .attr("cy", function (d) {
                return d.pixelLocation.y;
            })
            .style("fill", color)
            //.style("fill-opacity", 0.6)
            .style("fill-opacity", 1.0)
            .style("stroke", "black")
            .transition()
            .duration(500)
            //.attr("r", function(d, i) { return 5 + 15*(N-1-i)/(N-1); })
            .attr("r", radius)
            //.style("opacity", 1.0);
            .style("opacity", opacity);
            //.style("opacity", function(d, i){ return 0.3 + 0.7*i/(N-1); });

        markers.exit()
            .transition()
            .duration(500)
            .style("opacity", 0.0)
            .remove();
    };

    // onRemove() destroys the overlay when it is no longer needed.
    GMap.prototype.onRemove = function () {
        // TODO(choudhury): implement this function by removing the SVG element
        // from the pane.
        console.log("onRemove()!");

    };

    GMap.prototype.locations = function (locationData) {
        // TODO(choudhury): it might be better to actually copy the values here.
        //
        this.locationData = locationData;
        //this.locationData.length = 0;
        //for(var i=0; i<locationData.length; i++){
            //this.locationData.push(locationData[i]);
        //}
    };

    // This function is used to display the current state of the time slider.
    flickr.displayFunc = (function () {
        var lowdiv,
            highdiv;

     //   lowdiv = d3.select("#low");
     //   highdiv = d3.select("#high");

     //   return function (low, high) {
     //       lowdiv.html(new low);
     //       highdiv.html(new high);
     //   };
    }());

    

    // Some options for initializing the google map.
    //
    // Set to Paris, with good view of the Seine.
    options = {
        zoom: 5,
        center: new google.maps.LatLng(40,-90),
        mapTypeId: google.maps.MapTypeId.SATELLITE
        //mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    div = d3.select("#map").node();
    flickr.map = new GMap(div, options);

    // Direct the colormap selector radio buttons to redraw the map when they
    // are clicked.
    buttons = document.getElementsByName("colormap");
    redraw = function () {
        flickr.map.draw();
    };
    for (i = 0; i < buttons.length; i += 1) {
        buttons[i].onclick = redraw;
    }
  

    // Direct the glyph size radio buttons to redraw.
    buttons = document.getElementsByName("size");
    for (i = 0; i < buttons.length; i += 1) {
        buttons[i].onclick = redraw;
    }

    // Direct the size control to redraw.
    document.getElementById("size").onchange = redraw;

    // Create a regular slider for setting the opacity and direct it to redraw
    // when it changes (but not on every slide action - that would be bulky and
    // too slow; the UI doesn't demand that level of responsivity).
    flickr.opacityslider = $("#opacity");
    flickr.opacityslider.slider({
        min: 0,
        max: 100,
        value: 100,
        change: redraw
    });

    // The database lookup should happen again when the user changes any of the controls
    d3.select("#record-limit").node().onchange = retrieveData;
    d3.select("#start-time").node().onchange = changedUnixStartTime;
    //d3.select("#time-interval").node().onchange = retrieveData;

    // Attach actions to the zoom and unzoom buttons.
    zoomfunc = (function () {
        var zoom,
            unzoom,
            stack;

        zoom = d3.select("#zoom");
        unzoom = d3.select("#unzoom");

        stack = [];

        return {
            zoomer: function (slider) {
                var value,
                    bounds;

                // Return immediately if the handles are already at the bounds.
                //value = slider.getValue();
                value = slider.slider("values");
                //bounds = [slider.getMin(), slider.getMax()];
                bounds = [slider.slider("option", "min"), slider.slider("option", "max")];
                if (value[0] === bounds[0] && value[1] === bounds[1]) {
                    return;
                }

                // Save the current bounds on the stack.
                stack.push(bounds);

                // Set the bounds of the slider to be its current value range.
                //slider.setMin(value[0]);
                slider.slider("option", "min", value[0]);
                slider.slider("option", "max", value[1]);

                // Activate the unzoom button if this is the first entry in the
                // stack.
                if (stack.length === 1) {
                    unzoom.classed("disabled", false);
                }
            },

            unzoomer: function (slider) {
                var bounds;

                // Make sure this function is not being called when there are no
                // entries in the stack.
                if (stack.length === 0) {
                    throw "Logic error: Unzoom button was clicked even though there is nothing to unzoom to.";
                }

                // Pop a bounds value from the stack, and set it as the bounds
                // for the slider.
                bounds = stack.pop();
                //slider.setMin(bounds[0]);
                slider.slider("option", "min", bounds[0]);
                //slider.setMax(bounds[1]);
                slider.slider("option", "max", bounds[1]);

                // If the stack now contains no entries, disable the unzoom
                // button.
                if (stack.length === 0) {
                    unzoom.classed("disabled", true);
                }
            }
        };
    }());

    d3.select("#zoom")
        .data([flickr.timeslider])
        .on('click', zoomfunc.zoomer);

    d3.select("#unzoom")
        .data([flickr.timeslider])
        .on('click', zoomfunc.unzoomer);

    // Get the earliest and latest times in the database, to create a suitable
    // range for the time slider.  Pass in the "zoomer" function so the initial
    // range can be properly zoomed to begin with.
    //getMinMaxDates(zoomfunc.zoomer);

    // Install the abort action on the button.
    d3.select("#abort")
        .on("click", function () {
            // If there is a current ajax call in flight, abort it (it is
            // theoretically possible that the abort button is clicked between
            // the time it's activated, and the time an ajax call is sent).
            if(flickr.currentAjax){
                flickr.currentAjax.abort();
                flickr.currentAjax = null;

                // Place a message in the abort button.
                d3.select("#abort")
                    .classed("disabled", true)
                    .text("Query aborted");
            }

            // Disable the button.
            d3.select("#abort").classed("disabled", true);
        });

        retrieveData()
};
