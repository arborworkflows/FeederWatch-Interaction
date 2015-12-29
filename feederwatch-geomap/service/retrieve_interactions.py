import bson.json_util
import pymongo
import json
from bson import ObjectId
from pymongo import Connection
import string
import tangelo
import time
import csv

def decode(s, argname, resp):
    try:
        return bson.json_util.loads(s)
    except ValueError as e:
        resp['error'] = e.message + " (argument '%s' was '%s')" % (argname, s)
        raise


# this service returns ALL records in the interaction collection, spanning
# multiple FeederWatch observations. It is suitable for feeding the geomap. 


def run():
    # Create an empty response object.
    global nodeCount
    response = {}

    # open a link to the backing database

    connection = Connection('localhost', 27017)
    db = connection["FeederWatch"]
    data_coll = db['interactions']

   
    # split the single JSON object up into a hierarchy of objects by traversing the nested dictionaries and writing
    # documents in mongo during the traversal.  Store in a collection according to the name of the file dropped.
    try:
      query = {}
      interactionCursor = data_coll.find(query)
    except:
        response['error'] = "Could not find this observation"
        return bson.json_util.dumps(response)

    connection.close()

    response['result'] = {}
    response['result']['data'] = []
    for x in interactionCursor:
        response['result']['data'].append(x)

    # Pack the results into the response object, and return it.
    response['result']['status'] = 'OK'

    # Return the response object.
    #tangelo.log(str(response))
    return bson.json_util.dumps(response)
