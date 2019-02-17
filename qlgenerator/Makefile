.PHONY: all clean package install test

include ../rules/Makefile.conf
include ../rules/Makefile.common

# ==== sources and targets ====

SRC:=\
	GeneratePreviewForURL.m \
	UnMHTWebDelegate.m \
	GenerateThumbnailForURL.m \
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
	-framework Cocoa \
	-framework WebKit \
	-framework QuickLook

LDFLAGS:= -bundle

# ==== build rules ====

#SILENT:=@
include ../rules/Makefile.build

# ==== build rules - package ====

PACKAGE:=ql_unmht.qlgenerator

package: all $(BUILDDIR)/$(TARGET) $(BUILDDIR)/Info.plist $(SRCDIR)/Thumbnail.png $(UNMHT_LIBDIR)/js/ql_unmht.js
	$(MKDIR) -p $(BUILDDIR)
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/QuickLook
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents/MacOS/
	$(MKDIR) -p $(BUILDDIR)/$(PACKAGE)/Contents/Resources
	$(CP) $(SRCDIR)/Thumbnail.png $(BUILDDIR)/$(PACKAGE)/QuickLook/
	$(CP) $(BUILDDIR)/Info.plist $(BUILDDIR)/$(PACKAGE)/Contents/
	$(CP) $(BUILDDIR)/ql_unmht $(BUILDDIR)/$(PACKAGE)/Contents/MacOS/
	$(CP) $(UNMHT_LIBDIR)/js/ql_unmht.js $(BUILDDIR)/$(PACKAGE)/Contents/Resources/

$(BUILDDIR)/Info.plist: $(SRCDIR)/Info.plist ../mkinfo.py ../version.txt
	(cd ../; ./mkinfo.py qlgenerator/$(SRCDIR)/Info.plist qlgenerator/$(BUILDDIR)/Info.plist)

# ==== test ====

test:
	qlmanage -t ../lib/test/res/simple.mht
	qlmanage -p ../lib/test/res/simple.mht

# ==== install ====

install:
	mkdir -p ~/Library/QuickLook
	$(CP) -R $(BUILDDIR)/$(PACKAGE) ~/Library/QuickLook/
	$(TOUCH) ~/Library/QuickLook/$(PACKAGE)
	qlmanage -r
