#!/usr/bin/python
import cgi
import csv
import json

request = cgi.FieldStorage().getvalue('request')
if request == 'CONNECT':
    PASS = ['1234']
    password = cgi.FieldStorage().getvalue('password')
    print 'Content-type:text/html\n'
    print password in PASS
elif request == 'DATA':
    clicked_id = cgi.FieldStorage().getvalue('clicked_id')
    map_id = cgi.FieldStorage().getvalue('map_id')
    is_home = cgi.FieldStorage().getvalue('is_home')
    agg_origin = cgi.FieldStorage().getvalue('agg_origin')
    agg_destination = cgi.FieldStorage().getvalue('agg_destination')

    # Open the data file
    matrix = 'map2/data/matrix24' if cgi.FieldStorage().getvalue('map_id') == '1' else 'map/data/HW_matrix'
    if cgi.FieldStorage().getvalue('is_home') == 'true':
        fpath = '/home/users/web/b337/moo.ifelcoil/' + matrix + 'H'
    else:
        fpath = '/home/users/web/b337/moo.ifelcoil/' + matrix + 'W'
    
    if(agg_origin == None or agg_destination == None):
        fpath = fpath + '.csv'
    else:
        fpath = fpath + '_' + agg_origin + 'x' + agg_destination + '.csv'
    
    # Send shortened data to client
    f = open(fpath, 'rb')
    reader = csv.reader(f, delimiter='|')
    print 'Content-type:text/html\n'
    for i, line in enumerate(reader):
        if i == int(clicked_id)-1:
            print '|'.join(line)
            break
    f.close()
elif request == 'AGGREGATION':
    aggregation_level = cgi.FieldStorage().getvalue('aggregation_level')
    fpath = '/home/users/web/b337/moo.ifelcoil/map2/polygons2_' + aggregation_level + '.js'
    
    print 'Content-type:application/json\n'
    with open(fpath, 'r') as agg_file:
        data = agg_file.read()[15:-1] # delete 'polygons =' and ';' to get json
        print(data)
elif request == 'DISTRIBUTIONS':
    clicked_id = cgi.FieldStorage().getvalue('clicked_id')
    is_origin = cgi.FieldStorage().getvalue('is_origin')
    
    if (is_origin == 'true'):
        data_fpath = '/home/users/web/b337/moo.ifelcoil/map2/OD1250_DailyDistOrderOrigin.csv'
        offset_fpath = '/home/users/web/b337/moo.ifelcoil/map2/offsets_origin.csv'
    else:
        data_fpath = '/home/users/web/b337/moo.ifelcoil/map2/OD1250_DailyDistOrderDestination.csv'
        offset_fpath = '/home/users/web/b337/moo.ifelcoil/map2/offsets_destination.csv'

    offset = 0
    with open(offset_fpath, 'r') as f:
        reader = csv.reader(f, delimiter=',')
        for i, line in enumerate(reader):
            if (clicked_id == line[0]):
                offset = int(line[1])
                break            
    
    found = False
    data = []
    with open(data_fpath, 'r') as f:
        f.seek(offset)
        reader = csv.reader(f, delimiter=',')
        next(reader, None) # skip header
        for i, line in enumerate(reader):
            if (line[0] == clicked_id):
                found = True
                data.append(line[1:]) # skip origin/destination == clicked_id 
            elif (found):
                break
    
    print 'Content-type:application/json\n'
    print(json.dumps(data))
else:
    print 'ERROR (400 Bad Request)'