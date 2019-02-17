#!/usr/bin/python -B

import sys

with open('./version.txt') as f:
    version = f.read().replace('\r', '').replace('\n', '')

def transform(in_filename, out_filename):
    with open(out_filename, 'w') as out_file:
        with open(in_filename, 'r') as in_file:
            for line in in_file:
                line = line.replace('__VERSION__', version)
                out_file.write(line)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(1)

    transform(sys.argv[1],
              sys.argv[2])
