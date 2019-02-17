.PHONY: all clean package install test

include ../rules/Makefile.conf
include ../rules/Makefile.common

# ==== sources and targets ====

SRC:=\
	GetMetadataForFile.m \
	main.c

TARGET:=ql_unmht

# ==== build options ====

UNMHT_LIBDIR:=../lib

INCLUDE_DIRS:=\
	$(INCLUDE_DIRS) \
	-I $(UNMHT_LIBDIR)/src/
LIBS:=\
	$(LIBS) \
	$(UNMHT_LIBDIR)/build/unmht.a \
	-framework CoreServices

LDFLAGS:= -bundle

# ==== build rules ====

#SILENT:=@
include ../rules/Makefile.build

# ==== build rules - package ====

PACKAGE:=ql_unmht.mdimporter

package: all $(BUILDDIR)/$(TARGET) $(BUILDDIR)/Info.plist $(SRCDIR)/schema.xml $(SRCDIR)/Thumbnail.png $(UNMHT_LIBDIR)/js/ql_unmht.js
	$(MKDIR) -p $(BUILDDIR)
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Spotlight
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents/MacOS/
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents/Resources
	$(CP) $(SRCDIR)/Thumbnail.png $(BUILDDIR)/$(PACKAGE)/Spotlight/
	$(CP) $(BUILDDIR)/Info.plist $(BUILDDIR)/$(PACKAGE)/Contents/
	$(CP) $(BUILDDIR)/ql_unmht $(BUILDDIR)/$(PACKAGE)/Contents/MacOS/
	$(CP) $(UNMHT_LIBDIR)/js/ql_unmht.js $(BUILDDIR)/$(PACKAGE)/Contents/Resources/
	$(CP) $(SRCDIR)/schema.xml $(BUILDDIR)/$(PACKAGE)/Contents/Resources/

$(BUILDDIR)/Info.plist: $(SRCDIR)/Info.plist ../mkinfo.py ../version.txt
	(cd ../; ./mkinfo.py mdimporter/$(SRCDIR)/Info.plist mdimporter/$(BUILDDIR)/Info.plist)

# ==== test ====

test:
	mkdir -p ~/Desktop/_mdimporter_test
	cat ./res/input.mht > ~/Desktop/_mdimporter_test/input.mht
	sleep 3
	mdls ~/Desktop/_mdimporter_test/input.mht
	mdfind -onlyin ~/Desktop/_mdimporter_test contained
	rm -rf ~/Desktop/_mdimporter_test

# ==== install ====

install:
	mkdir -p ~/Library/Spotlight
	$(CP) -R $(BUILDDIR)/$(PACKAGE) ~/Library/Spotlight/
	$(TOUCH) ~/Library/Spotlight/$(PACKAGE)
