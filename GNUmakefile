###########################################################################
#
# This program is part of Zenoss Core, an open source monitoring platform.
# Copyright (C) 2013 Zenoss Inc.
#
# This program is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License version 2 or (at your
# option) any later version as published by the Free Software Foundation.
#
# For complete information please visit: http://www.zenoss.com/oss/
#
###########################################################################

PYTHON=$(shell which python)
HERE=$(PWD)
ZP_DIR=$(HERE)/ZenPacks/zenoss/Dashboard
LIB_DIR=$(ZP_DIR)/lib

default: build

egg:
	python setup.py bdist_egg

build:
	python setup.py bdist_egg
	python setup.py build

clean:
	rm -rf build dist *.egg-info

test:
	runtests ZenPacks.zenoss.Dashboard

reinstall:
	./reinstall.sh

pretty_xml:
	python $(ZP_DIR)/xml_format.py $(ZP_DIR)/objects/objects.xml

device:
	python add_device.py

pep8:
	./check_pep8.sh
