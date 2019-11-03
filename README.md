# TravelMap
Home &amp; Work Map Visualization for travels.

## Client
### Frameworks
- [Leaflet](https://leafletjs.com), which creates the entire map and features
- Ajax, for sending and retrieving data from the server
- Jsts, which calculates polygons unions
- [Turf](https://turfjs.org), for mathematical polygons calculations

### Data
[polygons2.js](https://github.com/TheMrPizza/TravelMap/blob/master/client/polygons2.js) contains the 2630 polygons shapes and properties (in a JavaScript variable named `polygons`) in the next format:
```js
var polygons = {"type": "FeatureCollection",
                "features": [{"type": "Feature",
                              "geometry": {"type": "Polygon", "coordinates": [[[34.79999555507011, 31.963873166446156], [...]]]},
                              "properties": {"center": [34.7934435533206, 31.9684081802784], "Over8Pop": 8881, "ID": 544, "name": "..."}
                              }, {...}]};
```

## Server
That is a [CGI server](https://en.wikipedia.org/wiki/Common_Gateway_Interface) with a Python 2.7 script that accepts 2 requests:
- `CONNECT` for checking if the password is correct
- `DATA` for reading one line of the passengers data from the server
### Data
[map.js](https://github.com/TheMrPizza/TravelMap/blob/master/client/map/map.js) (source map) is using `HW_matrixH.csv` and `HW_matrixW.csv` from the server. Similarly, [map2.js](https://github.com/TheMrPizza/TravelMap/blob/master/client/map2/map2.js) (day times map) is using `matrix24H.csv` and `matrix24W.csv`. On the server, the matrices are saved in a shortened format, for example:
```js
||[0,1,0,0]
|[0,1,74,38]|
[0,1,2,2]|[0,2,7,5]
```

This format can be created with [Mat2Csv.py](https://github.com/TheMrPizza/TravelMap/blob/master/server/DataProcessing/Mat2Csv.py), that takes each line from the original matrix and removes unnecessary spaces and **items with only zeroes**. The csv output file delimiter is `|`. That way, the example above was created with this 3D matrix:
```js
[[[0, 0, 0, 0], [0, 0, 0, 0], [0, 1, 0, 0]],
[[0, 0, 0, 0], [0, 1, 74, 38], [0, 0, 0, 0]],
[[0, 1, 2, 2], [0, 0, 0, 0], [0, 2, 7, 5]]]
```

Each item of the matrix represents the number of passengers that traveled from one polygon to another, so the `j`-th item of the `i`-th row (`matrix[i-1][j-1]`) represents the passengers that traveled from the `i`-th polygon to the `j`-th polygon. For example, the 2nd item of the 5th row (`matrix[4][1]`) is the number of the passengers that went from polygon #5 and ended in polygon #2.

The length of each item depends on the matrix type and takes a third variable into account. `matrix24H.csv`, for instance, has 7 numbers in each item, that divide the travels by the times of the day, so the first item is for 6-7 AM, the second for 7-8 AM and so on.

In each pair, the matrix that ends with `H` (home) is the same as the matrix above, and the one that ends with `W` (work) is a copy of the first matrix, but with swapped rows and columns. It makes the search of a specific polygon destination faster, as it searches for one line of the matrix.

[Data2Mat.py](https://github.com/TheMrPizza/TravelMap/blob/master/server/DataProcessing/Data2Mat.py) can create these matrices by reading the raw data csv file of the travels in the next format:
```
'UserId', 'StartTime', 'StartLat', 'Startlong', 'EndTime', 'EndLat', 'EndLong'
'00000000-003d-39ee-ffff-ffffceb80cab', '2018-03-07 16:48:15.593000000', '32.096557', '34.900413', '2018-03-07 17:10:22.543000000', '32.112564', '34.790919'
'00000000-005b-43fe-ffff-ffff87e2b912', '2018-04-02 11:46:55.823000000', '32.555156', '35.167812', '2018-04-02 12:28:09.623000000', '32.106501', '34.813480'
```
