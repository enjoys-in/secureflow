package constants

// DefaultImmutablePorts are the system default ports that can NEVER be deleted.
// Users can add new immutable ports, but these defaults are permanent.
var DefaultImmutablePorts = []int{22, 25, 465, 587, 3306, 6379}

// ServicePortNames maps default ports to their service names.
var ServicePortNames = map[int]string{
	22:   "SSH",
	25:   "SMTP",
	465:  "SMTPS",
	587:  "SMTP Submission",
	3306: "MySQL",
	6379: "Redis",
}

// IsDefaultImmutablePort checks if a port is in the default immutable list.
func IsDefaultImmutablePort(port int) bool {
	for _, p := range DefaultImmutablePorts {
		if p == port {
			return true
		}
	}
	return false
}
