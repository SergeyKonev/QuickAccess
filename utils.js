function getPortalLinkFromTab(url)
{
    const regex = /https?:\/\/([^\/]+)/;
    const match = url.match(regex);
    if (match)
    {
        return domainWithSubdomain = match[1];
    }
    else
    {
        return null;
    }
}

function isPortalForTest(portalUrl)
{
    if (portalUrl == null)
        return false;
    const regex = /(hotfix[a-z]*|bx(?:stage|prod|create|test))[^\/]+\.bitrix24\.[a-z\.]+/;
    const match = portalUrl.match(regex);
    return match != null;
}