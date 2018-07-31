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


class updateDenaliDefaultSiteUrl(ZenPackMigration):
    version = Version(1, 3, 0)

    def migrate(self, pack):
        if hasattr(pack.dmd.ZenUsers, 'dashboards'):
            changed = False
            updated_url = '7.0.0'
            prod_name = {'core': 'core', 'enterprise': 'commercial'}[pack.dmd.getProductName()]
            base_url = "https://www2.zenoss.com/in-app-welcome"
            doc_url = base_url + "?v=%s&p=%s" % (updated_url, prod_name)
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
                log.info('Committing changes')
                default.state = json.dumps(default_dashboard_json)

updateDenaliDefaultSiteUrl()
