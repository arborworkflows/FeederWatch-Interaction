import bson.json_util
import pymongo
import json
from bson import ObjectId
from pymongo import Connection
import string
import tangelo
import time
import csv
import arrow

def decode(s, argname, resp):
    try:
        return bson.json_util.loads(s)
    except ValueError as e:
        resp['error'] = e.message + " (argument '%s' was '%s')" % (argname, s)
        raise



def run(obsid,source,target,interaction,name,lat,lng,datetime):
    # Create an empty response object.
    global nodeCount
    response = {}

    # open a link to the backing database

    connection = Connection('localhost', 27017)
    db = connection["FeederWatch"]
    data_coll = db['interactions']

    currenttime = arrow.now().timestamp
   
    # Write out a single record for the observation.  The location is saved
    # as a tuple [longitude,latitude] to be compatible with standard mongoDB geo practices
    try:
        location_point = [float(lng),float(lat)]
        record = {'observation':obsid,'source':source,'target':target,'interaction':interaction,'location_name':name,'location': location_point,'date':datetime,'recorded':currenttime}
        interactionCursor = data_coll.insert(record)
    except:
        response['error'] = "Could not write"
        return bson.json_util.dumps(response)

    connection.close()

    response['data'] = []

    # Pack the results into the response object, and return it.
    #response['result'] = jsonoutput
    response['result'] = 'OK'

    # Return the response object.
    #tangelo.log(str(response))
    return bson.json_util.dumps(response)
