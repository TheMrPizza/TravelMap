import ast
import csv

MATRIX_FILE = r'matrix.txt'
HOME_FILE = r'matrixH.csv'
WORK_FILE = r'matrixW.csv'
ITEMS_NUM = 7


def read_file():
    """
    Read the matrix file and parse each line
    :return: List of the parsed lines
    """
    mat = open(MATRIX_FILE, 'rb')
    # Ignoring first character '['
    mat.seek(1)
    arr = []
    for i, row in enumerate(mat):
        if i == 2629:
            # Ignoring last character ']'
            arr.append(ast.literal_eval(row[:-1]))
        else:
            arr.append(ast.literal_eval(row[:-1])[0])
        print i
    mat.close()
    print 'Finished reading file'
    return arr


def write_output(arr, output_file):
    """
    Write the matrix to csv file in a shortened format
    :param arr: List of the parsed lines
    :param output_file: Path for the output file
    """
    output = open(output_file, 'wb')
    writer = csv.writer(output, delimiter='|')
    for i in xrange(len(arr)):
        cur = []
        for j in xrange(len(arr[i])):
            if arr[i][j] == [0] * ITEMS_NUM:  # All zeroes item
                cur.append('')
            else:
                cur.append('[' + ','.join(map(str, arr[i][j])) + ']')
        writer.writerow(cur)
        print i
    output.close()


def main():
    """
    Creating csv formatted home & work files from a matrix txt file
    """
    arr = read_file()
    write_output(arr, HOME_FILE)
    write_output(zip(*arr), WORK_FILE)


if __name__ == '__main__':
    main()
