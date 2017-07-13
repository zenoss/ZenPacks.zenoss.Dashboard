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
from Products.ZenModel.migrate.Migrate import Version
from Products.ZenModel.ZenPack import ZenPackMigration


class updateDefaultSiteUrl(ZenPackMigration):
    version = Version(1, 2, 6)

    def migrate(self, pack):
        try:
            DEFAULT_DASHBOARD_STATE = '[{"id":"col-0","items":[{"title":"Welcome to Zenoss!","refreshInterval":3000,"config":{"siteUrl":"https://www2.zenoss.com/in-app-welcome?v=4.9.70&p=%s"},"xtype":"sitewindowportlet","height":399,"collapsed":false},{"title":"Google Maps","refreshInterval":300,"config":{"baselocation":"/zport/dmd/Locations","pollingrate":400},"xtype":"googlemapportlet","height":400,"collapsed":false}]},{"id":"col-1","items":[{"title":"Open Events","refreshInterval":300,"config":{"stateId":"ext-gen1351"},"xtype":"eventviewportlet","height":400,"collapsed":false},{"title":"Open Events Chart","refreshInterval":300,"config":{"eventClass":"/","summaryFilter":"","daysPast":3},"xtype":"openeventsportlet","height":400,"collapsed":false}]}]'
            default = pack.dmd.ZenUsers.dashboards._getOb('default', None)
            if default:
                site={'core': 'core', 'enterprise': 'commercial'}[pack.dmd.getProductName()]
                default.state = DEFAULT_DASHBOARD_STATE % site
        except Exception as e:
            log.warning('Migrate script updateDefaultSiteUrl failed due to %s' % e.message)

updateDefaultSiteUrl()
