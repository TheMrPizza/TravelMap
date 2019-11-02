import fiona
from rtree import index
from shapely.geometry import shape, point
import csv
from datetime import datetime

POLYGONS_FILE = r'model_shape.shp'
DATA_FILE = r'raw_data.csv'
MATRIX_FILE = r'matrix.txt'
POLYGONS_NUM = 2630
ITEMS_NUM = 7

mat = []
polygons = [f for f in fiona.open(POLYGONS_FILE)]
idx = index.Index()


def setup():
    """
    Create a matrix with zeroes and add the polygons to the index
    """
    for i in xrange(POLYGONS_NUM):
        mat.append([[0 for j in xrange(ITEMS_NUM)] for k in xrange(POLYGONS_NUM)])
    for pos, polygon in enumerate(polygons):
        idx.insert(pos, shape(polygon['geometry']).bounds)
    print 'Finished setup'


def calc_matrix():
    """
    Fill the matrix with the passengers numbers from the raw data
    """
    # Reading the data file
    data = open(DATA_FILE, 'r')
    reader = csv.reader(data, delimiter=',')
    # Two unnecessary lines
    reader.next()
    reader.next()
    # Opening the output file
    output = open(MATRIX_FILE, 'wb')

    for row, i in enumerate(reader):
        # Parsing the two points
        points = [point.Point(float(i[3]), float(i[2])), point.Point(float(i[6]), float(i[5]))]
        points_id = []
        # Find the polygon where each point is located
        for j in points:
            polygon_id = -1
            for k in idx.intersection(j.coords[0]):
                if j.within(shape(polygons[k]['geometry'])):
                    polygon_id = polygons[k]['properties']['ID']
                    break
            points_id.append(polygon_id)
        if -1 not in points_id:  # Ignoring travels with errors
            try:
                time = datetime.strptime(i[1][:-3], '%Y-%m-%d %H:%M:%S.%f')  # Time format with milliseconds
            except ValueError:
                time = datetime.strptime(i[1], '%Y-%m-%d %H:%M:%S')

            # Sorting the travels by day times (by arrival time)
            if time.hour <= 6:  # Night
                mat[points_id[0] - 1][points_id[1] - 1][6] += 1
            elif time.hour <= 7:  # 6 AM
                mat[points_id[0] - 1][points_id[1] - 1][0] += 1
            elif time.hour <= 8:  # 7 AM
                mat[points_id[0] - 1][points_id[1] - 1][1] += 1
            elif time.hour <= 9:  # 8 AM
                mat[points_id[0] - 1][points_id[1] - 1][2] += 1
            elif time.hour <= 15:  # Noon
                mat[points_id[0] - 1][points_id[1] - 1][3] += 1
            elif time.hour <= 19:  # Afternoon
                mat[points_id[0] - 1][points_id[1] - 1][4] += 1
            elif time.hour <= 22:  # Evening
                mat[points_id[0] - 1][points_id[1] - 1][5] += 1
            else:  # Night
                mat[points_id[0] - 1][points_id[1] - 1][6] += 1
        if row % 100000 == 0:
            print row

    # Writing to output file
    print 'Writing to file'
    output.write('[' + ',\n'.join([str(i) for i in mat]) + ']')
    data.close()
    output.close()


def main():
    """
    Processing raw travel data to passengers number matrix from one polygon to another
    """
    setup()
    calc_matrix()


if __name__ == '__main__':
    main()
