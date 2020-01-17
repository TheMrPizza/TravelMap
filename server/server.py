#!"C:\Python27\python.exe"
import cgi
import csv

print 'Content-type:text/html\n'
request = cgi.FieldStorage().getvalue('request')
if request == 'CONNECT':
    PASS = ['1234']
    password = cgi.FieldStorage().getvalue('password')
    print password in PASS
elif request == 'DATA':
    clicked_id = cgi.FieldStorage().getvalue('clicked_id')
    map_id = cgi.FieldStorage().getvalue('map_id')
    is_home = cgi.FieldStorage().getvalue('is_home')

    # Open the data file
    matrix = 'map2/matrix24' if cgi.FieldStorage().getvalue('map_id') == '1' else 'map/HW_matrix'
    if cgi.FieldStorage().getvalue('is_home') == 'true':
        f = open(r'F:/github/TravelMap/server/Data' + matrix + 'H.csv', 'rb')
    else:
        f = open(r'F:/github/TravelMap/server/Data' + matrix + 'W.csv', 'rb')

    # Send shortened data to client
    reader = csv.reader(f, delimiter='|')
    for i, line in enumerate(reader):
        if i == int(clicked_id)-1:
            print '|'.join(line)
            break
    f.close()
else:
    print 'ERROR (400 Bad Request)'
