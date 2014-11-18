import os
import Globals
import logging
from Products.CMFCore.DirectoryView import registerDirectory
from Products.ZenRelations.RelSchema import ToOne, ToManyCont
from Products.ZenModel.UserSettings import UserSettings, UserSettingsManager, GroupSettings
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

DEFAULT_DASHBOARD_STATE = '[{"id":"col-0","items":[{"title":"Welcome to Zenoss!","config":{"siteUrl":"https://www2.zenoss.com/in-app-welcome?v=4.9.70&p=core"},"xtype":"sitewindowportlet","height":809}]},{"id":"col-1","items":[{"title":"Introduction To Zenoss","config":{"html":"<iframe width=\\"560\\" height=\\"315\\" src=\\"//www.youtube.com/embed/kFDCK4nUH3o\\" frameborder=\\"0\\" allowfullscreen></iframe>"},"xtype":"htmlportlet","height":400},{"title":"Device Issues","config":null,"xtype":"deviceissuesportlet","height":400}]},{"id":"col-2","items":[{"title":"Open Events Chart","config":null,"xtype":"openeventsportlet","height":400},{"title":"Google Maps","config":{"baselocation":"/zport/dmd/Locations","pollingrate":400},"xtype":"googlemapportlet","height":400}]}]'

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
            dashboard = Dashboard('default')
            dashboard.columns = 3
            dashboard.owner = 'admin'
            dashboard.state = DEFAULT_DASHBOARD_STATE
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
