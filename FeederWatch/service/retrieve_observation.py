import bson.json_util
import requests
import json
import string
import tangelo
from lxml import html 


def run(observationNumber=None):
    # Create an empty response object.
    response = {}
    #print "attempting to retrieve the feeder observation: ",observationNumber
    query = 'http://feederwatch.org/pfw/api/obs?id='+str(observationNumber)
    full_response = requests.get(query)
    response['observations'] = full_response.json()

    #print response.text

    # now scrape the HTML to get the date and the location. Specific XPATH queries are used to pull out the fields from the HTML page.
    # Warning: this will break if FeederWatch changes their HTML content enough.  It is recommended that the API query include 
    # more information instead of relying on page scraping. 

    page_query = 'http://feederwatch.org/pfw/count/summary?id='+str(observationNumber)
    page_response = requests.get(page_query)
    parse_tree = html.fromstring(page_response.content)
    location_name = parse_tree.xpath('//li[@class="cs-loc"]/text()')[0]
    location_lat = parse_tree.xpath('//@data-lat')[0]
    location_lng = parse_tree.xpath('//@data-lng')[0]
    date_collected = parse_tree.xpath('//li[@class="cs-date"]/text()')[0]
    response['metadata'] = {'location_name': location_name, 'location_lat': location_lat,'location_lng': location_lng,'date': date_collected}


    # Return the response object.
    #tangelo.log(str(response))
    return bson.json_util.dumps(response)
