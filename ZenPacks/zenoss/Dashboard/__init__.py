import os
import Globals
import logging
from Products.CMFCore.DirectoryView import registerDirectory
from Products.ZenRelations.RelSchema import ToOne, ToManyCont
from Products.ZenModel.UserSettings import UserSettings, UserSettingsManager, GroupSettings
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

    def remove(self, dmd, leaveObjects=False):
        super(ZenPack, self).remove(dmd, leaveObjects)
        if not leaveObjects:
            self._removeDashboards()

    def _removeDashboards():
        # TODO: actually remove the dashboards
        pass
