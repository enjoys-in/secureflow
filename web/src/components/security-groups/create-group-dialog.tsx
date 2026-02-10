import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

interface CreateGroupDialogProps {
  onCreateGroup: (name: string, description: string) => void
}

export function CreateGroupDialog({ onCreateGroup }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateGroup(name.trim(), description.trim())
    setOpen(false)
    setName("")
    setDescription("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-[#ff9900] hover:bg-[#ec7211] text-white">
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Security Group</DialogTitle>
          <DialogDescription>
            Add a new security group to organize your firewall rules.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sg-name">Group Name</Label>
            <Input
              id="sg-name"
              placeholder="e.g. Web Servers"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-desc">Description</Label>
            <Textarea
              id="sg-desc"
              placeholder="What is this security group for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#ff9900] hover:bg-[#ec7211] text-white"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
