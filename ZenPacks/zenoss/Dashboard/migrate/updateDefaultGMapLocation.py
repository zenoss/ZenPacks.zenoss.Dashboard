##############################################################################
#
# Copyright (C) Zenoss, Inc. 2018, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################


import logging
log = logging.getLogger("zen.migrate")

import Globals
import json
from zope.component import getUtility
from Products.ZenModel.migrate.Migrate import Version
from Products.ZenModel.ZenPack import ZenPackMigration
from Products.ZenUtils.virtual_root import IVirtualRoot


class updateDefaultGMapLocation(ZenPackMigration):
    """ Add cse prefix to base location of Google Map portlet"""

    version = Version(1, 3, 0)

    def migrate(self, pack):
        if hasattr(pack.dmd.ZenUsers, 'dashboards'):
            changed = False
            baselocation_old = '/zport/dmd/Locations'
            baselocation_new = getUtility(IVirtualRoot).ensure_virtual_root(baselocation_old)
            default = pack.dmd.ZenUsers.dashboards._getOb('default', None)
            if default:
                default_dashboard_json = json.loads(default.state)
                for column in default_dashboard_json:
                    portlets = column['items']
                    for portlet in portlets:
                        if "Google Maps" in portlet.get('title') and \
                               baselocation_old == portlet.get('config', {}).get('baselocation'):
                            portlet['config']['baselocation'] = baselocation_new
                            changed = True

            if changed:
                log.info("Committing changes.")
                default.state = json.dumps(default_dashboard_json)

updateDefaultGMapLocation()
