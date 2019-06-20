##############################################################################
#
# Copyright (C) Zenoss, Inc. 2019, all rights reserved.
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
from Products.ZenModel.ZVersion import VERSION
from Products.ZenModel.ZenPack import ZenPackMigration


class updateDefaultSiteUrlZsd(ZenPackMigration):
    version = Version(1, 3, 8)

    def migrate(self, pack):
        if hasattr(pack.dmd.ZenUsers, 'dashboards'):
            changed = False
            doc_url = "https://help.zenoss.com#main-content"
            if VERSION[0] == '6':
                doc_url = "https://help.zenoss.com/zsd#main-content"
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

updateDefaultSiteUrlZsd()
