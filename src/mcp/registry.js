export function createMcpRegistry({ listServers, loadServer }) {
  return {
    listConfiguredServers() {
      return listServers()
    },

    getServerConfig(id) {
      return loadServer(id)
    }
  }
}
