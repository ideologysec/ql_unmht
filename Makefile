.PHONY: all clean install

all:
	(cd lib; make)
	(cd qlgenerator; make package)
	(cd mdimporter; make package)

install:
	(cd qlgenerator; make install)
	(cd mdimporter; make install)

clean:
	(cd lib; make clean)
	(cd qlgenerator; make clean)
	(cd mdimporter; make clean)
