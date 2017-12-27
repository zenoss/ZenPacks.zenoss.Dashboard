##############################################################################
#
# Copyright (C) Zenoss, Inc. 2017, all rights reserved.
#
# This content is made available according to terms specified in
# License.zenoss under the directory where your Zenoss product is installed.
#
##############################################################################


import logging
log = logging.getLogger("zen.migrate")

import Globals
import json
from Products.ZenModel.migrate.Migrate import Version
from Products.ZenModel.ZenPack import ZenPackMigration


class updateDefaultSiteUrl(ZenPackMigration):
    version = Version(1, 2, 6)

    def migrate(self, pack):
        if hasattr(pack.dmd.ZenUsers, 'dashboards'):
            changed = False
            doc_url = "https://www2.zenoss.com/in-app-welcome" + \
                    "?v=4.9.70&p=%s" % {'core': 'core', 'enterprise': 'commercial'}[pack.dmd.getProductName()]
            default = pack.dmd.ZenUsers.dashboards._getOb('default', None)
            if default:
                default_dashboard_json = json.loads(default.state)
                for portlet in default_dashboard_json:
                    items = portlet['items']
                    for item in items:
                        if 'Welcome to Zenoss!' in item.get('title'):
                            if doc_url not in item['config']['siteUrl']:
                                item['config']['siteUrl'] = doc_url
                                changed = True

            if changed:
                default.state = json.dumps(default_dashboard_json)

updateDefaultSiteUrl()
