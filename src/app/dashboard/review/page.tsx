import { UploadZone } from "@/components/review/upload-zone";

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Contract</h1>
        <p className="text-muted-foreground">
          Upload a contract to run AI-powered analysis against your playbook.
        </p>
      </div>
      <UploadZone />
    </div>
  );
}
