import os
import Globals
import logging
from zope.component import getUtility
from Products.CMFCore.DirectoryView import registerDirectory
from Products.ZenRelations.RelSchema import ToOne, ToManyCont
from Products.ZenModel.UserSettings import UserSettings, UserSettingsManager
from Products.ZenUtils.virtual_root import IVirtualRoot
from ZenPacks.zenoss.Dashboard.Dashboard import Dashboard
log = logging.getLogger('zen.dashboard')

USER_SETTINGS_RELATIONSHIP = ("dashboards", ToManyCont(ToOne, "ZenPacks.zenoss.Dashboard.Dashboard",
                              "userSetting")),

UserSettings._relations += USER_SETTINGS_RELATIONSHIP

SETTINGS_MANAGER_RELATIONSHIP = ("dashboards", ToManyCont(ToOne, "ZenPacks.zenoss.Dashboard.Dashboard",
                              "userSettingManager")),

UserSettingsManager._relations += SETTINGS_MANAGER_RELATIONSHIP


skinsDir = os.path.join(os.path.dirname(__file__), 'skins')
if os.path.isdir(skinsDir):
    registerDirectory(skinsDir, globals())

from Products.ZenModel.ZenPack import ZenPack as ZenPackBase

DEFAULT_DASHBOARD_STATE = '[{"id":"col-0","items":[{"title":"Welcome to Zenoss!","refreshInterval":3000,"config":{"siteUrl":"https://www2.zenoss.com/in-app-welcome?v=7.0.0&p=%s"},"xtype":"sitewindowportlet","height":399,"collapsed":false},{"title":"Google Maps","refreshInterval":300,"config":{"baselocation":"%s","pollingrate":400},"xtype":"googlemapportlet","height":400,"collapsed":false}]},{"id":"col-1","items":[{"title":"Open Events","refreshInterval":300,"config":{"stateId":"ext-gen1351"},"xtype":"eventviewportlet","height":400,"collapsed":false},{"title":"Open Events Chart","refreshInterval":300,"config":{"eventClass":"/","summaryFilter":"","daysPast":3},"xtype":"openeventsportlet","height":400,"collapsed":false}]}]'

class ZenPack(ZenPackBase):
    """

    """

    def install(self, dmd):
        super(ZenPack, self).install(dmd)
        self._buildRelationships(dmd)

    def _buildRelationships(self, dmd):
        log.info("Building dashboard relationships on user manager")
        # manager
        dmd.ZenUsers.buildRelations()
        # users
        settings = dmd.ZenUsers.getAllUserSettings()
        log.info("Building dashboard relationships on %s users ", len(settings))
        for setting in settings:
            setting.buildRelations()

        # groups
        groups = dmd.ZenUsers.getAllGroupSettings()
        log.info("Building dashboard relationships on %s User Groups ", len(groups))
        for group in groups:
            group.buildRelations()
        default = dmd.ZenUsers.dashboards._getOb('default', None)
        if not default:
            log.info("Creating the default Dashboard")
            site = {'core': 'core', 'enterprise': 'commercial'}[dmd.getProductName()]
            baselocation = getUtility(IVirtualRoot).ensure_virtual_root("/zport/dmd/Locations")
            dashboard = Dashboard('default')
            dashboard.columns = 2
            dashboard.owner = 'admin'
            dashboard.state = DEFAULT_DASHBOARD_STATE % (site, baselocation)
            dmd.ZenUsers.dashboards._setObject('default', dashboard)

    def remove(self, dmd, leaveObjects=False):
        super(ZenPack, self).remove(dmd, leaveObjects)
        if not leaveObjects:
            self._removeDashboards(dmd)

    def _removeDashboards(self, dmd):
        # manager
        dmd.ZenUsers._delObject('dashboards')
        # users
        settings = dmd.ZenUsers.getAllUserSettings()
        log.info("Removing dashboard relationships on %s users ", len(settings))
        for setting in settings:
            setting._delObject('dashboards')

        # groups
        groups = dmd.ZenUsers.getAllGroupSettings()
        log.info("Removing dashboard relationships on %s User Groups ", len(groups))
        for group in groups:
            group._delObject('dashboards')

# With the old dashboard, there was only 1 and the portlets had access controls.
# With this zenpack, there are multiple dashboards, and they have access controls.
# The old screen for setting portlet access controls doesn't change anything on
# the dashboards provided by this zenpack.
from Products.ZenModel.DataRoot import DataRoot
from Products.ZenModel.UserSettings import UserSettingsManager
from Products.ZenModel.ZenossInfo import ZenossInfo
from Products.ZenModel.ZenPackManager import ZenPackManager

for klass in DataRoot, UserSettingsManager, ZenossInfo, ZenPackManager:
    orig_actions = klass.factory_type_information[0]['actions']
    klass.factory_type_information[0]['actions'] = tuple([act for act in orig_actions if act['id'] is not 'portlets'])
